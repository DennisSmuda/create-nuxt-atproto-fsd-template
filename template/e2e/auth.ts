import type { BrowserContext } from '@playwright/test'
import { encode } from 'next-auth/jwt'
import { AUTH_SECRET, BASE_URL } from './env'
import type { SeedUser } from './seed-users'

// next-auth's default; server/api/auth/[...].ts doesn't override session.maxAge.
const SESSION_MAX_AGE = 30 * 24 * 60 * 60

/**
 * Signs a browser context in as a seeded user by minting the same session
 * JWT next-auth's callback route would issue on a real sign-in, and setting
 * it as a cookie directly
 *
 * - Mirrors the `jwt` callback in server/api/auth/[...].ts field-for-field:
 */
export async function signInAs(context: BrowserContext, user: SeedUser): Promise<void> {
  const token = await encode({
    secret: AUTH_SECRET,
    maxAge: SESSION_MAX_AGE,
    token: {
      sub: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      picture: null,
      hasPassword: false,
      atprotoHandle: null,
      atprotoAvatarUrl: null,
    },
  })

  await context.addCookies([
    {
      name: 'next-auth.session-token',
      value: token,
      url: BASE_URL,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
}
