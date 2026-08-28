import { clientMetadata } from '../utils/atproto'

/**
 * OAuth client metadata, served at the URL that is this client's id.
 * Built by the same function `atprotoClient()` uses, so they can't drift apart.
 */
export default defineEventHandler(() => clientMetadata())
