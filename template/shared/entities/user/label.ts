/** How a user is written on screen. */

type Labelled = { name?: string | null; atprotoHandle?: string | null } | null | undefined

/** The `@handle` an account is known by, or an empty string. */
export function accountLabel(user: Labelled): string {
  return user?.atprotoHandle ? `@${user.atprotoHandle}` : ''
}

export function displayName(user: Labelled, fallback = 'Unknown'): string {
  return user?.name?.trim() || accountLabel(user) || fallback
}
