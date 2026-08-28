import { changePassword } from '../../domain/user'
import { requirePasswordAuth } from '../../utils/password-auth'

export default defineEventHandler(async (event) => {
  requirePasswordAuth()

  const user = await requireUser(event)

  const body = await readBody<{ currentPassword?: unknown; newPassword?: unknown }>(event)

  if (
    typeof body.currentPassword !== 'string' ||
    !body.currentPassword ||
    typeof body.newPassword !== 'string' ||
    !body.newPassword
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'errors.currentNewPasswordRequired',
    })
  }

  await changePassword(user, body.currentPassword, body.newPassword)

  return { success: true }
})
