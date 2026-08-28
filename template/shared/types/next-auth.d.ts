/**
 * Session/JWT fields set by the callbacks in `server/api/auth/[...].ts`.
 * Lives here because `shared/` is the one directory both tsconfigs pull ambient `.d.ts` from.
 */
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user?: {
      id: string
      /** The AT Protocol handle this account signs in with. */
      atprotoHandle: string | null
      /** On the session as well as `PublicUser` so the header avatar needs no fetch. */
      atprotoAvatarUrl: string | null
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    /** All optional: a token minted before a field existed will not have it. */
    id?: string
    atprotoHandle?: string | null
    atprotoAvatarUrl?: string | null
  }
}
