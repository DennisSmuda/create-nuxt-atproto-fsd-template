import { canDeleteAccount } from '../../domain/user'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)

  return { canDelete: await canDeleteAccount(userId) }
})
