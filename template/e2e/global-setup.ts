import { execFileSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { DATABASE_PATH, DATABASE_URL } from './env'
import { SEED_USERS } from './seed-users'

/**
 * Resets the sqlite file, applies migrations via `prisma migrate deploy`, and
 * seeds SEED_USERS so specs can sign in as one via `signInAs` (auth.ts)
 */
export default async function globalSetup() {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    const path = DATABASE_PATH + suffix
    if (existsSync(path)) rmSync(path)
  }

  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { ...process.env, DATABASE_URL },
    stdio: 'inherit',
  })

  // Datasource override, not process.env: this process's DATABASE_URL (if any)
  // shouldn't leak into a client that must point at the e2e db specifically.
  const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } })
  try {
    await prisma.user.createMany({ data: SEED_USERS })
  } finally {
    await prisma.$disconnect()
  }
}
