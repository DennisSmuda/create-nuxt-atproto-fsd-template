import { issueTicket, redeemTicket, registerAtprotoUser } from '../../domain/user'
import { fetchAvatarUrl } from '../../utils/atproto'
import { rateLimit } from '../../utils/rate-limit'

/**
 * Finishes a Bluesky signup: confirms the display name.
 * DID comes off the ticket, never the body — the browser is trusted only for
 * the name. Returns a fresh `signin` ticket, since the caller's next move is
 * to spend it at the `atproto` provider for a session.
 */
export default defineEventHandler(async (event) => {
  rateLimit(event, { name: 'atproto-register', limit: 10, windowMs: 60_000 })

  const body = await readBody<{ ticket?: unknown; name?: unknown }>(event)

  if (typeof body.ticket !== 'string' || !body.ticket) {
    throw createError({ statusCode: 400, statusMessage: 'errors.invalidTicket' })
  }

  if (typeof body.name !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'validation.nameRequired' })
  }

  const ticket = await redeemTicket(body.ticket, 'signup')

  if (!ticket) {
    throw createError({ statusCode: 401, statusMessage: 'errors.invalidTicket' })
  }

  // Read from the ticket's DID, not carried across the redirect — the browser gets no say.
  const avatarUrl = await fetchAvatarUrl(ticket.did)

  const user = await registerAtprotoUser({
    did: ticket.did,
    handle: ticket.handle,
    avatarUrl,
    name: body.name,
  })

  const token = await issueTicket({
    kind: 'signin',
    userId: user.id,
    did: ticket.did,
    handle: ticket.handle,
  })

  return { ticket: token }
})
