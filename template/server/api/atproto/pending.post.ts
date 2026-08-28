import { peekTicket } from '../../domain/user'
import { fetchProfile } from '../../utils/atproto'
import { rateLimit } from '../../utils/rate-limit'

/**
 * The handle behind an unspent signup ticket, plus a name to prefill the form.
 *
 * POST with the ticket in the body, not a query param — a ticket is a bearer
 * credential, and a query string ends up in access logs.
 *
 * Reads, doesn't redeem: a form reload mustn't cost the ticket. Rate limited
 * since each peek is an outbound call to the AppView.
 */
export default defineEventHandler(async (event) => {
  rateLimit(event, { name: 'atproto-pending', limit: 30, windowMs: 60_000 })

  const body = await readBody<{ ticket?: unknown }>(event)

  if (typeof body.ticket !== 'string' || !body.ticket) {
    throw createError({ statusCode: 400, statusMessage: 'errors.invalidTicket' })
  }

  const pending = await peekTicket(body.ticket, 'signup')

  if (!pending) {
    throw createError({ statusCode: 401, statusMessage: 'errors.invalidTicket' })
  }

  // Best effort — a failed profile load costs a typed name, not the signup.
  const { displayName } = await fetchProfile(pending.did)

  // Handle and name only — the bound DID stays server-side.
  return { handle: pending.handle, displayName }
})
