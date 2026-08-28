import type { PublicUser } from '#shared/entities/user'
import { normalizeEmail, validateName, validatePassword } from '#shared/entities/user'
import { hashPassword } from '../../utils/password'
import prisma from '../../utils/prisma'

/**
 * Creates a password account. Dev-only in practice — see `password-auth.ts`
 * for why the route in front of this is gated.
 */
export async function registerUser(params: {
  email: string
  name: string
  password: string
}): Promise<PublicUser> {
  const nameError = validateName(params.name)
  if (nameError) {
    throw createError({ statusCode: 400, statusMessage: nameError })
  }

  const passwordError = validatePassword(params.password)
  if (passwordError) {
    throw createError({ statusCode: 400, statusMessage: passwordError })
  }

  const email = normalizeEmail(params.email)

  const existingUser = await prisma.user.findUnique({ where: { email } })

  if (existingUser) {
    throw createError({ statusCode: 409, statusMessage: 'errors.emailExists' })
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: params.name.trim(),
      password: await hashPassword(params.password),
    },
  })

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    atprotoHandle: user.atprotoHandle,
    atprotoAvatarUrl: user.atprotoAvatarUrl,
  }
}
