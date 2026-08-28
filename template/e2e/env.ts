import { fileURLToPath } from 'node:url'

export const PORT = 3100
export const BASE_URL = `http://127.0.0.1:${PORT}`

// Shared with playwright.config.ts's webServer and with auth.ts's session-cookie
// minting — both must sign with the same secret the running server decodes with.
export const AUTH_SECRET = 'e2e-test-secret'

// Absolute, not `file:./e2e.db`: Prisma resolves a relative sqlite path
// against the schema file for `migrate` but against the process cwd for the
// client, so a relative path here and in global-setup.ts could each mean a
// different file.
export const DATABASE_PATH = fileURLToPath(new URL('./e2e.db', import.meta.url))
export const DATABASE_URL = `file:${DATABASE_PATH}`
