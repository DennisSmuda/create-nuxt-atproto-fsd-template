/** User fields safe to send to a client, plus the matching Prisma `select`. */
export interface PublicUser {
  id: string
  name: string | null
  /** Readable label for the account; the DID stays server-side. */
  atprotoHandle: string | null
  atprotoAvatarUrl: string | null
}

export const publicUserSelect = {
  id: true,
  name: true,
  atprotoHandle: true,
  atprotoAvatarUrl: true,
} as const
