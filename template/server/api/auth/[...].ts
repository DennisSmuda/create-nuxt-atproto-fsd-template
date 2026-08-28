import { NuxtAuthHandler } from '#auth'
import CredentialsProviderModule from 'next-auth/providers/credentials'
import prisma from '../../utils/prisma'
import { redeemTicket, verifyCredentials } from '../../domain/user'
import { passwordAuthEnabled } from '../../utils/password-auth'
import { rateLimit } from '../../utils/rate-limit'

/**
 * next-auth is CommonJS, so the default import is either the factory or a
 * namespace wrapping it depending on bundler interop. Narrowed back to the
 * factory's type — replaces an `as any` that erased every option.
 */
type CredentialsProviderFactory = typeof CredentialsProviderModule
const CredentialsProvider =
  (CredentialsProviderModule as { default?: CredentialsProviderFactory }).default ??
  CredentialsProviderModule

const handler = NuxtAuthHandler({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Gated here, not just on the login page — hiding a form isn't disabling a provider.
        if (!passwordAuthEnabled()) {
          return null
        }

        if (!credentials?.email || !credentials?.password) {
          return null
        }

        return verifyCredentials(credentials.email, credentials.password)
      },
    }),

    /**
     * Bluesky sign-in, arriving as a ticket, not a secret — next-auth's OAuth
     * machinery can't drive AT Protocol (per-user issuer, PAR, DPoP), so that
     * runs in `server/api/atproto/` instead; by the time a ticket exists the
     * identity is already proven.
     */
    CredentialsProvider({
      id: 'atproto',
      name: 'Bluesky',
      credentials: {
        ticket: { label: 'Ticket', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.ticket) {
          return null
        }

        const ticket = await redeemTicket(credentials.ticket, 'signin')

        if (!ticket?.userId) {
          return null
        }

        const user = await prisma.user.findUnique({ where: { id: ticket.userId } })

        // A closed account mustn't be reopened by a ticket issued before it closed.
        if (!user || user.deletedAt) {
          return null
        }

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id

        // Read once at sign-in, carried for the token's life — nothing today
        // can change these without a fresh sign-in.
        const row = await prisma.user.findUnique({
          where: { id: user.id },
          select: { password: true, atprotoHandle: true, atprotoAvatarUrl: true },
        })
        token.hasPassword = Boolean(row?.password)
        token.atprotoHandle = row?.atprotoHandle ?? null
        token.atprotoAvatarUrl = row?.atprotoAvatarUrl ?? null
      }
      return token
    },
    async session({ session, token }) {
      // A pre-`id` token carries no id; the session then has none and requireUserId 401s, correctly.
      if (session.user && typeof token.id === 'string') {
        session.user.id = token.id
        // Defaults to true for a token predating this field — worst case, shows
        // the change-password form to someone who can't use it.
        session.user.hasPassword = token.hasPassword ?? true
        session.user.atprotoHandle = token.atprotoHandle ?? null
        session.user.atprotoAvatarUrl = token.atprotoAvatarUrl ?? null
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NUXT_AUTH_SECRET,
})

/**
 * Rate limited around the handler, not inside `authorize` — next-auth stops
 * passing the request down before that point, and both providers post to
 * `/api/auth/callback/…`, the one unauthenticated entry point here.
 */
export default defineEventHandler((event) => {
  if (event.method === 'POST' && event.path.startsWith('/api/auth/callback/')) {
    rateLimit(event, { name: 'auth-callback', limit: 10, windowMs: 60_000 })
  }

  return handler(event)
})
