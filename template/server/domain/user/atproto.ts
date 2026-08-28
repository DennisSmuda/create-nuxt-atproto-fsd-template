import { Prisma } from '@prisma/client'
import type { PublicUser } from '#shared/entities/user'
import { validateName } from '#shared/entities/user'
import prisma from '../../utils/prisma'

/**
 * Accounts that sign in through AT Protocol. The DID is the identity — a
 * handle is a rented name, stored only as a refreshed display label.
 */

const toPublicUser = (user: {
  id: string
  email: string | null
  name: string | null
  atprotoHandle: string | null
  atprotoAvatarUrl: string | null
}): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  atprotoHandle: user.atprotoHandle,
  atprotoAvatarUrl: user.atprotoAvatarUrl,
})

/** `deleteAccount` clears the DID it anonymises, so a hit here is a live account; `deletedAt` guards rows predating that. */
export async function findUserByDid(did: string): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({ where: { atprotoDid: did } })

  if (!user || user.deletedAt) {
    return null
  }

  return toPublicUser(user)
}

/**
 * Both fields always written, null included — a removed picture must clear, not linger.
 * `updateMany` so a closed account is a no-op, not a 500.
 */
export async function refreshAtprotoProfile(
  userId: string,
  profile: { handle: string; avatarUrl: string | null },
): Promise<void> {
  await prisma.user.updateMany({
    where: { id: userId, deletedAt: null },
    data: { atprotoHandle: profile.handle, atprotoAvatarUrl: profile.avatarUrl },
  })
}

/**
 * Opens an account for a proven DID — like `registerUser` but with no
 * password and an identity proven by OAuth, not typed into the browser.
 * No email is asked for or stored.
 */
export async function registerAtprotoUser(params: {
  did: string
  handle: string
  avatarUrl: string | null
  name: string
}): Promise<PublicUser> {
  const nameError = validateName(params.name)
  if (nameError) {
    throw createError({ statusCode: 400, statusMessage: nameError })
  }

  const name = params.name.trim()

  // A DID that already has an account means two sign-ins raced the signup form.
  const existingDid = await prisma.user.findUnique({
    where: { atprotoDid: params.did },
  })

  if (existingDid) {
    throw createError({ statusCode: 409, statusMessage: 'errors.atprotoAlreadyLinked' })
  }

  const user = await prisma.user
    .create({
      data: {
        email: null,
        name,
        password: null,
        atprotoDid: params.did,
        atprotoHandle: params.handle,
        atprotoAvatarUrl: params.avatarUrl,
      },
    })
    .catch((err) => {
      // The check above is racy; the unique index settles it. Only one unique
      // column here, so a P2002 must be about the DID.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw createError({
          statusCode: 409,
          statusMessage: 'errors.atprotoAlreadyLinked',
        })
      }
      throw err
    })

  return toPublicUser(user)
}
