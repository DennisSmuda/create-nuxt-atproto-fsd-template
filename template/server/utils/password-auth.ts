/**
 * Email+password sign-in is a dev affordance, not a product feature — lets a
 * local database be seeded without a Bluesky account. Off in production
 * unless explicitly enabled (`NUXT_PUBLIC_PASSWORD_AUTH=true`), since it's a
 * weaker path in (no rate limiting, no recovery flow).
 *
 * Reads public runtime config, not `process.env`, so the server and the login
 * page can't disagree about whether the form should exist.
 */
export function passwordAuthEnabled(): boolean {
  return useRuntimeConfig().public.passwordAuth === true
}

/** 404 rather than 403: a disabled feature has no endpoint to report on. */
export function requirePasswordAuth(): void {
  if (!passwordAuthEnabled()) {
    throw createError({ statusCode: 404, statusMessage: 'errors.notFound' })
  }
}
