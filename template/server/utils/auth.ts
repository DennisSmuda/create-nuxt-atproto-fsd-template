import type { H3Event } from 'h3'
import type { User } from '@prisma/client'
import { getServerSession } from '#auth'
import prisma from './prisma'

/**
 * The signed-in user's id, or a 401.
 *
 * Re-checks the row, not just the session token — sessions are JWTs this app
 * can't revoke, so a closed account's session stays valid until it expires.
 */
export async function requireUserId(event: H3Event): Promise<string> {
  const session = await getServerSession(event)
  const id = session?.user?.id

  if (!id) {
    throw createError({ statusCode: 401, statusMessage: 'errors.unauthorized' })
  }

  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  })

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'errors.unauthorized' })
  }

  return user.id
}

/** The signed-in user's row. Use when the handler needs more than the id. */
export async function requireUser(event: H3Event): Promise<User> {
  const session = await getServerSession(event)
  const id = session?.user?.id

  if (!id) {
    throw createError({ statusCode: 401, statusMessage: 'errors.unauthorized' })
  }

  const user = await prisma.user.findUnique({ where: { id } })

  if (!user || user.deletedAt) {
    throw createError({ statusCode: 404, statusMessage: 'errors.userNotFound' })
  }
  return user
}
