/**
 * Translation key to show for a failed `$fetch`. Reads Nitro's `error.data.statusMessage`
 * when present, falling back to `fallback` for network failures and unexpected shapes.
 */
export function errorMessage(error: unknown, fallback: string): string {
  const data = (error as { data?: { statusMessage?: string } } | null)?.data
  return data?.statusMessage || fallback
}
