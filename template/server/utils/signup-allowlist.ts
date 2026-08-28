/**
 * Restricts new accounts to Bluesky handles the operator already knows,
 * comma-separated in `SIGNUP_ALLOWLIST`. Unset or empty means the list is
 * off: anyone can sign up. Existing accounts can still log in — this only
 * gates account creation.
 */
function allowlist(): string[] | null {
  const raw = process.env.SIGNUP_ALLOWLIST

  if (!raw?.trim()) {
    return null
  }

  return raw
    .split(',')
    .map((entry) => normalize(entry))
    .filter(Boolean)
}

function normalize(identifier: string): string {
  return identifier.trim().replace(/^@/, '').toLowerCase()
}

export function isSignupAllowed(identifier: string): boolean {
  const list = allowlist()
  return list === null || list.includes(normalize(identifier))
}
