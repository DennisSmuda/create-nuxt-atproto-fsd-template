/**
 * Reads the sign-in ticket from the URL fragment and strips it from the URL.
 * The fragment (not the query string) is used because it's never sent to the
 * server, so the bearer credential never hits an access log. Client-only —
 * the server never receives a fragment.
 *
 * @returns The sign-in ticket, or an empty string if none was found.
 */
export function readAtprotoTicket(): string {
  if (import.meta.server) return ''

  const ticket = new URLSearchParams(window.location.hash.slice(1)).get('ticket')

  if (ticket) {
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname + window.location.search,
    )
  }

  return ticket ?? ''
}
