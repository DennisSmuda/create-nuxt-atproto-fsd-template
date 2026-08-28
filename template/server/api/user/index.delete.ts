import { deleteAccount } from '../../domain/user'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  await deleteAccount(user.id)

  return { success: true }
})
