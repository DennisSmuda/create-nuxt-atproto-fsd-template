# Sign in with Atmosphere Account

AT Protocol OAuth, `atproto` scope only (DID + handle, no account access).
Runs server-side in `server/api/atproto/`, via `@atproto/oauth-client-node`.

## Why server-side

Every `server/api/` route authorizes through `requireUserId`, which reads a
next-auth session. A browser-side OAuth client (e.g. `nuxt-atproto`) would
produce a signed-in page backed by no session, so every call 401s. Running
the exchange in Nitro lets the DID come from the authorization server, not
the request, and get traded for a real session.

## The ticket handoff

The OAuth callback can't mint a session cookie directly, so it records what
it proved as a ticket — hashed, single-use, 2-minute expiry — and redirects
to a page that spends it against the `atproto` credentials provider. The
ticket travels in the URL **fragment**, the one part of a URL browsers never
send to a server, so it never hits an access log. The OAuth session is
revoked as soon as the DID/handle are read; nothing is kept beyond that.

## Pinned to the initiating browser

`@atproto/oauth-client`'s `state` check proves a DID but not whose return
trip it is — a captured callback URL replayed elsewhere would sign the
replayer into someone else's account. `/api/atproto/authorize` sets an
httpOnly `SameSite=Lax` nonce cookie and sends the same nonce as `appState`;
the callback requires both to match. `Lax` is deliberate: the callback is a
cross-site top-level navigation, which `Lax` still sends the cookie for.

The signup handle is never passed across the redirect either — the "signed
in as @…" page asks `/api/atproto/pending`, which reads it off the ticket.
The DID never leaves the server.

## Rate limiting and cleanup

`/api/atproto/authorize` is reachable pre-account and resolves handles via
outbound calls, so it's limited to 10/min/caller (`server/utils/rate-limit.ts`,
in-memory, per-process — fine for one Nitro process on one SQLite file).
The tables this feature adds are swept on each successful callback rather
than on a timer, since they only grow when a sign-in starts.

## First-time signup

A Bluesky identity has no email, so a first-time user is asked for one once
at `/atmosphere/register`, as a contact address only (`server/utils/signup-allowlist.ts`
can restrict this to identities you already know). `User.password` stays
null — password sign-in refuses such rows.

Avatar comes from Bluesky's public AppView (no auth needed), cached on the
user row and refreshed each sign-in.

## Setup

No new env vars — client metadata is derived from `APP_ORIGIN` and served
at `/client-metadata.json` (a public client, no keys to rotate).

**In dev, browse to `http://127.0.0.1:3000`, not `localhost:3000`.** The
atproto dev exception requires `client_id` origin `http://localhost` but a
loopback-IP-literal redirect; a mismatched browser origin sets the session
cookie somewhere it won't be read back from. `devServer.host` is pinned to
`127.0.0.1` in `nuxt.config.ts` for this reason (plain `localhost` binds
`::1` only on macOS). Keep `APP_ORIGIN`, `NUXT_AUTH_ORIGIN` and the port in
step if you change it.
