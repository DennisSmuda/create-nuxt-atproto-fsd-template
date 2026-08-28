/** Canonical form for storing/comparing emails, so capitalization can't affect login. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isSameEmail(a: string, b: string): boolean {
  return normalizeEmail(a) === normalizeEmail(b)
}
