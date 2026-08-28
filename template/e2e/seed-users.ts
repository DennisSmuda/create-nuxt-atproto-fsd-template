/**
 * Fixed id rather than Prisma's default cuid, so a spec can reference the
 * user without reading it back from the database first.
 */
export const SEED_USERS = [
  { id: 'e2e-seed-user-alice', name: 'Alice', email: 'alice@e2e.test' },
] as const

export type SeedUser = (typeof SEED_USERS)[number]
