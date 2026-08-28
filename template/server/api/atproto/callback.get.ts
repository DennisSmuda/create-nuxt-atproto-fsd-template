import { Client } from '@atproto/lex'
import * as com from '../../lexicons/com'
import {
  atprotoClient,
  consumeFlow,
  fetchAvatarUrl,
  flowMatches,
  purgeExpiredOauthState,
  purgeStaleOauthSessions,
} from '../../utils/atproto'
import {
  findUserByDid,
  issueTicket,
  purgeExpiredTickets,
  refreshAtprotoProfile,
} from '../../domain/user'
import { isSignupAllowed } from '../../utils/signup-allowlist'

/**
 * Where the PDS sends the user back — the only place that learns a DID it
 * can trust (out of the token exchange, not the request).
 *
 * Can't mint a session itself (next-auth does), so it redirects to a page
 * carrying a one-use ticket, in the URL *fragment* so it never reaches a
 * server access log.
 */
export default defineEventHandler(async (event) => {
  const params = getRequestURL(event).searchParams

  // Read before anything that can throw: the nonce is good for one attempt.
  const expectedNonce = consumeFlow(event)

  // These tables only grow when a sign-in starts, so sweeping here (not on a timer) is enough.
  await Promise.all([
    purgeExpiredTickets(),
    purgeExpiredOauthState(),
    purgeStaleOauthSessions(),
  ])

  let did: string
  let handle: string

  try {
    const { session, state } = await atprotoClient().callback(params)
    did = session.did

    // The library's `state` check is shared across all users, so it can't
    // prove whose browser this is — see `beginFlow` for what does.
    if (!flowMatches(state, expectedNonce)) {
      await atprotoClient()
        .revoke(did)
        .catch(() => {})
      return sendRedirect(event, '/login?atproto=failed')
    }

    // The PDS answering for its own user, so the handle is as current as it gets.
    const client = new Client(session)
    const info = await client.call(com.atproto.server.getSession, {})
    handle = info.handle
  } catch {
    return sendRedirect(event, '/login?atproto=failed')
  }

  // We only needed identity, not ongoing access — holding refresh tokens this
  // app never uses is pure liability. A refused revocation isn't our problem.
  await atprotoClient()
    .revoke(did)
    .catch(() => {})

  const user = await findUserByDid(did)

  if (user) {
    // Best effort: a sign-in does not fail over a profile picture.
    const avatarUrl = await fetchAvatarUrl(did)
    await refreshAtprotoProfile(user.id, { handle, avatarUrl })
    const token = await issueTicket({ kind: 'signin', userId: user.id, did, handle })
    return sendRedirect(event, `/atmosphere/signin#ticket=${encodeURIComponent(token)}`)
  }

  // No account yet. Gate here, before a signup ticket ever exists, so a
  // handle outside the allowlist never reaches the register form.
  if (!isSignupAllowed(handle)) {
    return sendRedirect(event, '/login?atproto=not-allowed')
  }

  // The ticket buys a signup form, not a session. The handle isn't passed in
  // the URL: the page shows it as "signed in as @…", which a browser-supplied
  // value can't credibly assert. It asks pending.post.ts for it instead.
  const token = await issueTicket({ kind: 'signup', userId: null, did, handle })
  return sendRedirect(event, `/atmosphere/register#ticket=${encodeURIComponent(token)}`)
})
