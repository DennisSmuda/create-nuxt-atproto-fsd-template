/** Display-name rules, shared so client and server agree. Returns a translation key, or null if acceptable. */
export const NAME_MAX_LENGTH = 80

export function validateName(name: string): string | null {
  const trimmed = name.trim()

  if (!trimmed) return 'validation.nameRequired'
  if (trimmed.length > NAME_MAX_LENGTH) return 'validation.nameTooLong'

  return null
}
