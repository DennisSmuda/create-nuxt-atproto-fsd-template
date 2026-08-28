import prisma from '../../utils/prisma'

/**
 * Whether an account can be deleted outright.
 *
 * Always true in this template — there's no ledger or ownership to check yet.
 * Once a domain slice adds data a deleted user would strand (money owed,
 * content only they can act on), gate it here rather than in the API route,
 * so every caller agrees on the rule.
 */
export async function canDeleteAccount(_userId: string): Promise<boolean> {
  return true
}

/** Closes an account. Anonymise instead of `delete` once other tables reference the user row. */
export async function deleteAccount(userId: string): Promise<void> {
  if (!(await canDeleteAccount(userId))) {
    throw createError({ statusCode: 400, statusMessage: 'errors.accountNotSettled' })
  }

  await prisma.user.delete({ where: { id: userId } })
}
