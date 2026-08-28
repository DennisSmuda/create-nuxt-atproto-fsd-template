import { createHash, randomBytes } from 'crypto'
import prisma from '../../utils/prisma'

/**
 * Handoff between a verified AT Protocol callback and next-auth: the callback
 * proves identity server-side but can't mint a session cookie itself, so it
 * records a ticket, which the browser then spends at the `atproto` provider.
 *
 * Treated as a bearer credential: unguessable, hashed at rest, valid two
 * minutes, single use.
 */

/**
 * `signin` says "this DID belongs to this account" and is worth a session.
 * `signup` says only "this DID was proven" — there is no account yet. Keeping
 * them apart is what stops a signup ticket being redeemed as a session.
 */
export type TicketKind = 'signin' | 'signup'

const TICKET_TTL_MS = 2 * 60 * 1000

export interface AtprotoTicket {
  kind: TicketKind
  userId: string | null
  did: string
  handle: string
}

/** Unsalted SHA-256 is fine here — the input is 32 random bytes, so there's no dictionary to attack. */
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export async function issueTicket(ticket: AtprotoTicket): Promise<string> {
  const token = randomBytes(32).toString('base64url')

  await prisma.atprotoAuthTicket.create({
    data: {
      tokenHash: hashToken(token),
      kind: ticket.kind,
      userId: ticket.userId,
      did: ticket.did,
      handle: ticket.handle,
      expiresAt: new Date(Date.now() + TICKET_TTL_MS),
    },
  })

  return token
}

/**
 * Spends a ticket of the expected kind, or returns null.
 *
 * `deleteMany`'s count settles a race: two requests reading the same token
 * concurrently, only one deletes it. Refusals happen after the delete, so any
 * presented ticket is spent regardless of outcome.
 *
 * Null for every failure (unknown/expired/spent/wrong kind) — sign-in
 * shouldn't narrate why it refused.
 */
export async function redeemTicket(
  token: string,
  kind: TicketKind,
): Promise<AtprotoTicket | null> {
  const tokenHash = hashToken(token)

  const row = await prisma.atprotoAuthTicket.findUnique({ where: { tokenHash } })

  if (!row) return null

  const { count } = await prisma.atprotoAuthTicket.deleteMany({ where: { tokenHash } })

  if (count === 0) return null
  if (row.kind !== kind) return null
  if (row.expiresAt.getTime() < Date.now()) return null

  return toTicket(row)
}

/** Reads a ticket without spending it — the signup page shows the handle before anything's confirmed, and a reload shouldn't strand it. */
export async function peekTicket(
  token: string,
  kind: TicketKind,
): Promise<AtprotoTicket | null> {
  const row = await prisma.atprotoAuthTicket.findUnique({
    where: { tokenHash: hashToken(token) },
  })

  if (!row) return null
  if (row.kind !== kind) return null
  if (row.expiresAt.getTime() < Date.now()) return null

  return toTicket(row)
}

const toTicket = (row: {
  kind: string
  userId: string | null
  did: string
  handle: string
}): AtprotoTicket => ({
  kind: row.kind as TicketKind,
  userId: row.userId,
  did: row.did,
  handle: row.handle,
})

/** Runs on the way through the callback, not a timer — the table only grows when a sign-in starts. */
export async function purgeExpiredTickets(): Promise<void> {
  await prisma.atprotoAuthTicket.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
}
