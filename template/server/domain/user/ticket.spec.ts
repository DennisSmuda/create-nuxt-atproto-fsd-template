import { beforeEach, describe, expect, it, vi } from 'vitest'

/** A ticket is a bearer credential for one redirect — the failure modes (spent twice, spent late, wrong kind) are what matter here. */

const { prisma } = vi.hoisted(() => ({
  prisma: {
    atprotoAuthTicket: {
      create: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('../../utils/prisma', () => ({ default: prisma }))

const { issueTicket, peekTicket, redeemTicket, purgeExpiredTickets } =
  await import('./ticket')

const future = () => new Date(Date.now() + 60_000)
const past = () => new Date(Date.now() - 1)

/** The row `create` would have written for the token it was handed. */
const rowFor = (token: string, over: Record<string, unknown> = {}) => ({
  tokenHash: prisma.atprotoAuthTicket.create.mock.calls.at(-1)?.[0].data.tokenHash,
  kind: 'signin',
  userId: 'user-1',
  did: 'did:plc:abc',
  handle: 'alice.bsky.social',
  expiresAt: future(),
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  prisma.atprotoAuthTicket.create.mockResolvedValue({})
  prisma.atprotoAuthTicket.deleteMany.mockResolvedValue({ count: 1 })
})

describe('issueTicket', () => {
  it('never stores the token it hands out', async () => {
    const token = await issueTicket({
      kind: 'signin',
      userId: 'user-1',
      did: 'did:plc:abc',
      handle: 'alice.bsky.social',
    })

    const { data } = prisma.atprotoAuthTicket.create.mock.calls[0]![0]

    expect(token).toBeTruthy()
    expect(data.tokenHash).not.toBe(token)
    expect(JSON.stringify(data)).not.toContain(token)
  })

  it('gives every ticket a different token', async () => {
    const ticket = {
      kind: 'signin' as const,
      userId: 'user-1',
      did: 'did:plc:abc',
      handle: 'alice.bsky.social',
    }

    expect(await issueTicket(ticket)).not.toBe(await issueTicket(ticket))
  })
})

describe('redeemTicket', () => {
  it('returns what the ticket asserts', async () => {
    const token = await issueTicket({
      kind: 'signin',
      userId: 'user-1',
      did: 'did:plc:abc',
      handle: 'alice.bsky.social',
    })
    prisma.atprotoAuthTicket.findUnique.mockResolvedValue(rowFor(token))

    await expect(redeemTicket(token, 'signin')).resolves.toEqual({
      kind: 'signin',
      userId: 'user-1',
      did: 'did:plc:abc',
      handle: 'alice.bsky.social',
    })
  })

  it('deletes the row it redeems, so a second attempt finds nothing', async () => {
    const token = await issueTicket({
      kind: 'signin',
      userId: 'user-1',
      did: 'did:plc:abc',
      handle: 'alice.bsky.social',
    })
    prisma.atprotoAuthTicket.findUnique.mockResolvedValueOnce(rowFor(token))

    await redeemTicket(token, 'signin')
    expect(prisma.atprotoAuthTicket.deleteMany).toHaveBeenCalled()

    prisma.atprotoAuthTicket.findUnique.mockResolvedValueOnce(null)
    await expect(redeemTicket(token, 'signin')).resolves.toBeNull()
  })

  it('refuses when the delete removed nothing — someone else got there first', async () => {
    const token = await issueTicket({
      kind: 'signin',
      userId: 'user-1',
      did: 'did:plc:abc',
      handle: 'alice.bsky.social',
    })
    prisma.atprotoAuthTicket.findUnique.mockResolvedValue(rowFor(token))
    prisma.atprotoAuthTicket.deleteMany.mockResolvedValue({ count: 0 })

    await expect(redeemTicket(token, 'signin')).resolves.toBeNull()
  })

  it('refuses an expired ticket', async () => {
    const token = await issueTicket({
      kind: 'signin',
      userId: 'user-1',
      did: 'did:plc:abc',
      handle: 'alice.bsky.social',
    })
    prisma.atprotoAuthTicket.findUnique.mockResolvedValue(
      rowFor(token, { expiresAt: past() }),
    )

    await expect(redeemTicket(token, 'signin')).resolves.toBeNull()
  })

  /** A signup ticket (userId: null) must fail on kind, not fall over later on the missing id. */
  it('refuses a signup ticket presented as a sign-in', async () => {
    const token = await issueTicket({
      kind: 'signup',
      userId: null,
      did: 'did:plc:abc',
      handle: 'alice.bsky.social',
    })
    prisma.atprotoAuthTicket.findUnique.mockResolvedValue(
      rowFor(token, { kind: 'signup', userId: null }),
    )

    await expect(redeemTicket(token, 'signin')).resolves.toBeNull()
  })

  it('spends an expired ticket even when it refuses it', async () => {
    const token = await issueTicket({
      kind: 'signin',
      userId: 'user-1',
      did: 'did:plc:abc',
      handle: 'alice.bsky.social',
    })
    prisma.atprotoAuthTicket.findUnique.mockResolvedValue(
      rowFor(token, { expiresAt: past() }),
    )

    await redeemTicket(token, 'signin')

    // A refused row left behind stays guessable until swept.
    expect(prisma.atprotoAuthTicket.deleteMany).toHaveBeenCalled()
  })

  it('refuses an unknown token without deleting anything', async () => {
    prisma.atprotoAuthTicket.findUnique.mockResolvedValue(null)

    await expect(redeemTicket('never-issued', 'signin')).resolves.toBeNull()
    expect(prisma.atprotoAuthTicket.deleteMany).not.toHaveBeenCalled()
  })
})

describe('peekTicket', () => {
  it('reads the ticket without spending it', async () => {
    const token = await issueTicket({
      kind: 'signup',
      userId: null,
      did: 'did:plc:abc',
      handle: 'alice.bsky.social',
    })
    prisma.atprotoAuthTicket.findUnique.mockResolvedValue(
      rowFor(token, { kind: 'signup', userId: null }),
    )

    const peeked = await peekTicket(token, 'signup')

    expect(peeked?.handle).toBe('alice.bsky.social')
    // The whole point: the signup form can be reloaded and still work.
    expect(prisma.atprotoAuthTicket.deleteMany).not.toHaveBeenCalled()
  })

  it('refuses a sign-in ticket presented as a signup', async () => {
    const token = await issueTicket({
      kind: 'signin',
      userId: 'user-1',
      did: 'did:plc:abc',
      handle: 'alice.bsky.social',
    })
    prisma.atprotoAuthTicket.findUnique.mockResolvedValue(rowFor(token))

    expect(await peekTicket(token, 'signup')).toBeNull()
  })

  it('refuses an expired ticket', async () => {
    const token = await issueTicket({
      kind: 'signup',
      userId: null,
      did: 'did:plc:abc',
      handle: 'alice.bsky.social',
    })
    prisma.atprotoAuthTicket.findUnique.mockResolvedValue(
      rowFor(token, { kind: 'signup', userId: null, expiresAt: past() }),
    )

    expect(await peekTicket(token, 'signup')).toBeNull()
  })

  it('refuses an unknown token', async () => {
    prisma.atprotoAuthTicket.findUnique.mockResolvedValue(null)

    expect(await peekTicket('nonsense', 'signup')).toBeNull()
  })
})

describe('purgeExpiredTickets', () => {
  it('removes only what has expired', async () => {
    await purgeExpiredTickets()

    const { where } = prisma.atprotoAuthTicket.deleteMany.mock.calls[0]![0]
    expect(where.expiresAt.lt).toBeInstanceOf(Date)
  })
})
