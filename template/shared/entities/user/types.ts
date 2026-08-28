/** User fields safe to send to a client, plus the matching Prisma `select`. */
export interface PublicUser {
  id: string
  name: string | null
  /** Null for an AT Protocol account or a closed one. */
  email: string | null
  /** Readable label for an AT Protocol account; the DID stays server-side. */
  atprotoHandle: string | null
  atprotoAvatarUrl: string | null
}

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  atprotoHandle: true,
  atprotoAvatarUrl: true,
} as const
