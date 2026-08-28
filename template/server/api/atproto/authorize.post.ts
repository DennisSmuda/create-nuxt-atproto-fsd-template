import { atprotoClient, beginFlow } from '../../utils/atproto'
import { rateLimit } from '../../utils/rate-limit'

/**
 * Starts a Bluesky sign-in: turns a handle into the URL to redirect to.
 * `beginFlow` pins the return trip to this browser.
 *
 * Rate limited — reachable without an account, and makes an outbound call to
 * whatever host the resolved DID document names.
 */
export default defineEventHandler(async (event) => {
  rateLimit(event, { name: 'atproto-authorize', limit: 10, windowMs: 60_000 })

  const body = await readBody<{ handle?: unknown }>(event)

  if (typeof body.handle !== 'string' || !body.handle.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'errors.handleRequired' })
  }

  // People paste what they see, and Bluesky shows handles with a leading '@'.
  const handle = body.handle.trim().replace(/^@/, '').toLowerCase()

  try {
    const url = await atprotoClient().authorize(handle, { state: beginFlow(event) })
    return { url: url.toString() }
  } catch (error) {
    // Logged because this also catches client-metadata/config errors, not just bad handles.
    console.error('atproto authorize failed', error)
    throw createError({ statusCode: 400, statusMessage: 'errors.atprotoHandleNotFound' })
  }
})
