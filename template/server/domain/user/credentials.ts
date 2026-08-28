import type { User } from '@prisma/client'
import type { PublicUser } from '#shared/entities/user'
import { normalizeEmail, validatePassword } from '#shared/entities/user'
import { hashPassword, verifyPassword } from '../../utils/password'
import prisma from '../../utils/prisma'

/** Null for any failure: a closed account, no password set, or a wrong one. */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
  })

  if (!user || user.deletedAt) {
    return null
  }

  if (!user.password) {
    return null
  }

  if (!(await verifyPassword(password, user.password))) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    atprotoHandle: user.atprotoHandle,
    atprotoAvatarUrl: user.atprotoAvatarUrl,
  }
}

export async function changePassword(
  user: User,
  currentPassword: string,
  newPassword: string,
) {
  const passwordError = validatePassword(newPassword)
  if (passwordError) {
    throw createError({ statusCode: 400, statusMessage: passwordError })
  }

  // Nothing to prove and nothing to replace: this account signs in through AT
  // Protocol. Setting a first password would need its own proof of identity
  // rather than borrowing this one.
  if (!user.password) {
    throw createError({ statusCode: 400, statusMessage: 'errors.noPasswordSet' })
  }

  if (!(await verifyPassword(currentPassword, user.password))) {
    throw createError({
      statusCode: 401,
      statusMessage: 'errors.currentPasswordIncorrect',
    })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(newPassword) },
  })
}
