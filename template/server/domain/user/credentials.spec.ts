import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `User.password` is nullable (Bluesky accounts). Comparing a submitted
 * password against a stored `null` is a bcrypt-binding question, not an
 * identity one — the absence must be checked, not compared.
 */

const { prisma, verifyPassword, hashPassword } = vi.hoisted(() => ({
  prisma: { user: { findUnique: vi.fn(), update: vi.fn() } },
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
}))

vi.mock('../../utils/prisma', () => ({ default: prisma }))
vi.mock('../../utils/password', () => ({ verifyPassword, hashPassword }))

const { verifyCredentials, changePassword } = await import('./credentials')

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

const passwordUser = {
  id: 'u1',
  email: 'alice@example.com',
  name: 'Alice',
  password: '$2a$10$hash',
  deletedAt: null,
}

const blueskyUser = { ...passwordUser, id: 'u2', password: null }

beforeEach(() => {
  vi.clearAllMocks()

  // h3 auto-imports createError at runtime; stub it for tests.
  vi.stubGlobal('createError', (init: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(init.statusMessage), init),
  )

  verifyPassword.mockResolvedValue(true)
  hashPassword.mockResolvedValue('$2a$10$new')
})

describe('verifyCredentials', () => {
  it('accepts a matching password', async () => {
    prisma.user.findUnique.mockResolvedValue(passwordUser)

    await expect(verifyCredentials('alice@example.com', 'secret')).resolves.toEqual({
      id: 'u1',
      email: 'alice@example.com',
      name: 'Alice',
    })
  })

  /** verifyPassword is stubbed to agree — the refusal must come before it's ever asked. */
  it('refuses a passwordless account without consulting the hash', async () => {
    prisma.user.findUnique.mockResolvedValue(blueskyUser)

    await expect(verifyCredentials('alice@example.com', 'secret')).resolves.toBeNull()
    expect(verifyPassword).not.toHaveBeenCalled()
  })

  it('refuses a passwordless account for an empty password too', async () => {
    prisma.user.findUnique.mockResolvedValue(blueskyUser)

    await expect(verifyCredentials('alice@example.com', '')).resolves.toBeNull()
    expect(verifyPassword).not.toHaveBeenCalled()
  })

  it('refuses a closed account', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...passwordUser, deletedAt: new Date() })

    await expect(verifyCredentials('alice@example.com', 'secret')).resolves.toBeNull()
  })
})

describe('changePassword', () => {
  it('replaces the password once the current one is proven', async () => {
    await changePassword(passwordUser as any, 'secret', 'new-secret')

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { password: '$2a$10$new' },
    })
  })

  it('tells a Bluesky account there is no password to change', async () => {
    await expect(
      statusOf(changePassword(blueskyUser as any, 'anything', 'new-secret')),
    ).resolves.toEqual({ statusCode: 400, statusMessage: 'errors.noPasswordSet' })

    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})
