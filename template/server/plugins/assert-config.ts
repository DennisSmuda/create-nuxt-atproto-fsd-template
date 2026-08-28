import { assertProductionOrigin } from '../utils/atproto'

/**
 * Validates security-critical config once at boot, failing loudly instead of
 * letting a bad `APP_ORIGIN` or missing session secret fail silently at runtime.
 */
export default defineNitroPlugin(() => {
  assertProductionOrigin()

  if (process.env.NODE_ENV === 'production' && !process.env.NUXT_AUTH_SECRET) {
    throw new Error(
      'NUXT_AUTH_SECRET must be set in production: it signs session tokens.',
    )
  }
})
