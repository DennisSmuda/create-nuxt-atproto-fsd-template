import { registerUser } from '../domain/user'
import { requirePasswordAuth } from '../utils/password-auth'
import { rateLimit } from '../utils/rate-limit'
import { isSignupAllowed } from '../utils/signup-allowlist'

/**
 * Open a password account. Gated: this is a development affordance, not a way
 * into the product — see `server/utils/password-auth.ts`.
 */
export default defineEventHandler(async (event) => {
  requirePasswordAuth()

  rateLimit(event, { name: 'register', limit: 10, windowMs: 60 * 60_000 })

  const body = await readBody<{ email?: unknown; name?: unknown; password?: unknown }>(
    event,
  )

  if (
    typeof body.email !== 'string' ||
    !body.email.trim() ||
    typeof body.name !== 'string' ||
    !body.name.trim() ||
    typeof body.password !== 'string' ||
    !body.password
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'errors.emailPasswordNameRequired',
    })
  }

  if (!isSignupAllowed(body.email)) {
    throw createError({ statusCode: 403, statusMessage: 'errors.signupNotAllowed' })
  }

  return registerUser({
    email: body.email,
    name: body.name,
    password: body.password,
  })
})
