import { Prisma } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NAME_MAX_LENGTH } from '#shared/entities/user'

/**
 * Opening an account from a DID rather than a password. The DID is the
 * identity, and the only thing this account is ever matched on — no email
 * is stored or taken from the signup form.
 */

const { prisma } = vi.hoisted(() => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  },
}))

vi.mock('../../utils/prisma', () => ({ default: prisma }))

const { findUserByDid, refreshAtprotoProfile, registerAtprotoUser } =
  await import('./atproto')

const DID = 'did:plc:abc123'
const HANDLE = 'alice.bsky.social'
const AVATAR = 'https://cdn.bsky.app/img/avatar/plain/did:plc:abc123/xyz@jpeg'

/** An error as `createError` builds it, which is what the route surfaces. */
async function statusOf(promise: Promise<unknown>) {
  const error: any = await promise.then(
    () => {
      throw new Error('expected the call to reject')
    },
    (err) => err,
  )
  return { statusCode: error.statusCode, statusMessage: error.statusMessage }
}

/** Answer `findUnique`, which registration only ever asks by DID. */
function givenUsers({ byDid = null }: Record<string, any> = {}) {
  prisma.user.findUnique.mockImplementation(() => Promise.resolve(byDid))
}

beforeEach(() => {
  vi.clearAllMocks()

  // h3 auto-imports createError at runtime; stub it for tests.
  vi.stubGlobal('createError', (init: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(init.statusMessage), init),
  )

  givenUsers()
  prisma.user.create.mockImplementation(({ data }: any) =>
    Promise.resolve({ id: 'user-new', ...data }),
  )
})

describe('findUserByDid', () => {
  it('finds a live account by its DID', async () => {
    givenUsers({
      byDid: {
        id: 'u1',
        email: null,
        name: 'Alice',
        atprotoHandle: HANDLE,
        atprotoAvatarUrl: AVATAR,
        deletedAt: null,
      },
    })

    await expect(findUserByDid(DID)).resolves.toEqual({
      id: 'u1',
      email: null,
      name: 'Alice',
      atprotoHandle: HANDLE,
      atprotoAvatarUrl: AVATAR,
    })
  })

  it('does not resurrect a closed account', async () => {
    givenUsers({
      byDid: { id: 'u1', email: null, name: null, deletedAt: new Date() },
    })

    await expect(findUserByDid(DID)).resolves.toBeNull()
  })

  it('is null for a DID nobody has signed up with', async () => {
    await expect(findUserByDid(DID)).resolves.toBeNull()
  })
})

describe('registerAtprotoUser', () => {
  it('creates an account with no password, no email, and the proven DID', async () => {
    await registerAtprotoUser({
      did: DID,
      handle: HANDLE,
      avatarUrl: AVATAR,
      name: 'Alice',
    })

    const { data } = prisma.user.create.mock.calls[0]![0]

    expect(data).toMatchObject({
      // Explicit, not left off — an AT Protocol identity has no address to give.
      email: null,
      name: 'Alice',
      password: null,
      atprotoDid: DID,
      atprotoHandle: HANDLE,
      atprotoAvatarUrl: AVATAR,
    })
  })

  it('never looks an address up, because it is not given one', async () => {
    await registerAtprotoUser({
      did: DID,
      handle: HANDLE,
      avatarUrl: AVATAR,
      name: 'Alice',
    })

    for (const [args] of prisma.user.findUnique.mock.calls) {
      expect(args.where.email).toBeUndefined()
    }
  })

  it('refuses a DID that already has an account', async () => {
    givenUsers({ byDid: { id: 'u1', atprotoDid: DID } })

    await expect(
      statusOf(
        registerAtprotoUser({
          did: DID,
          handle: HANDLE,
          avatarUrl: AVATAR,
          name: 'Alice',
        }),
      ),
    ).resolves.toEqual({ statusCode: 409, statusMessage: 'errors.atprotoAlreadyLinked' })

    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('refuses a name that is only whitespace', async () => {
    await expect(
      statusOf(
        registerAtprotoUser({
          did: DID,
          handle: HANDLE,
          avatarUrl: AVATAR,
          name: '   ',
        }),
      ),
    ).resolves.toEqual({ statusCode: 400, statusMessage: 'validation.nameRequired' })
  })

  it('refuses a name longer than the shared bound', async () => {
    await expect(
      statusOf(
        registerAtprotoUser({
          did: DID,
          handle: HANDLE,
          avatarUrl: AVATAR,
          name: 'a'.repeat(NAME_MAX_LENGTH + 1),
        }),
      ),
    ).resolves.toEqual({ statusCode: 400, statusMessage: 'validation.nameTooLong' })

    expect(prisma.user.create).not.toHaveBeenCalled()
  })
})

describe('registerAtprotoUser, losing a race', () => {
  /**
   * The pre-check reads before it writes, so two signups can race past it —
   * the unique index settles it, and the loser gets the same 409 it would
   * have gotten a moment earlier, not a 500.
   */
  const p2002 = (target: string | string[]) =>
    Object.assign(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: 'test',
      }),
      { meta: { target } },
    )

  const register = () =>
    registerAtprotoUser({
      did: DID,
      handle: HANDLE,
      avatarUrl: AVATAR,
      name: 'Alice',
    })

  it('reports a lost DID race as the conflict it is', async () => {
    prisma.user.create.mockRejectedValue(p2002(['atprotoDid']))

    expect(await statusOf(register())).toEqual({
      statusCode: 409,
      statusMessage: 'errors.atprotoAlreadyLinked',
    })
  })

  it('says the same whatever shape the connector reports the index in', async () => {
    // meta.target's shape varies by connector; only one unique index can be hit here anyway.
    prisma.user.create.mockRejectedValue(p2002('User_atprotoDid_key'))

    expect(await statusOf(register())).toEqual({
      statusCode: 409,
      statusMessage: 'errors.atprotoAlreadyLinked',
    })
  })

  it('does not dress up an error that is not a conflict', async () => {
    prisma.user.create.mockRejectedValue(new Error('the database is on fire'))

    await expect(register()).rejects.toThrow('the database is on fire')
  })
})

describe('refreshAtprotoProfile', () => {
  it('writes the handle and picture just reported', async () => {
    await refreshAtprotoProfile('u1', { handle: 'alice.example.com', avatarUrl: AVATAR })

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', deletedAt: null },
      data: { atprotoHandle: 'alice.example.com', atprotoAvatarUrl: AVATAR },
    })
  })

  /** A no-op, not a throw — an account closed mid-request mustn't turn a sign-in into a 500. */
  it('does not write to a closed account', async () => {
    await refreshAtprotoProfile('u1', { handle: HANDLE, avatarUrl: AVATAR })

    const { where } = prisma.user.updateMany.mock.calls[0]![0]
    expect(where.deletedAt).toBeNull()
  })

  /** Guards against a "write only what we have" bug that would keep a removed avatar showing. */
  it('clears a picture that has been taken down', async () => {
    await refreshAtprotoProfile('u1', { handle: HANDLE, avatarUrl: null })

    const { data } = prisma.user.updateMany.mock.calls[0]![0]
    expect(data.atprotoAvatarUrl).toBeNull()
  })
})
