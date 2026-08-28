/** Password rules, shared so client and server agree. Returns a translation key, or null if acceptable. */
export const PASSWORD_MIN_LENGTH = 6

export function validatePassword(password: string): string | null {
  if (!password) return 'validation.passwordRequired'
  if (password.length < PASSWORD_MIN_LENGTH) return 'validation.passwordTooShort'
  return null
}

/** Pass no confirmation to check the password alone. */
export function validateNewPassword(
  password: string,
  confirmation?: string,
): string | null {
  const error = validatePassword(password)
  if (error) return error

  if (confirmation !== undefined && password !== confirmation) {
    return 'validation.passwordsDoNotMatch'
  }
  return null
}
