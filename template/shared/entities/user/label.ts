/** How a user is written on screen. */

type Labelled =
  | { name?: string | null; email?: string | null; atprotoHandle?: string | null }
  | null
  | undefined

/** The email or `@handle` an account is known by, whichever it has, or an empty string. */
export function accountLabel(user: Labelled): string {
  if (user?.email) return user.email

  return user?.atprotoHandle ? `@${user.atprotoHandle}` : ''
}

export function displayName(user: Labelled, fallback = 'Unknown'): string {
  return user?.name?.trim() || accountLabel(user) || fallback
}
