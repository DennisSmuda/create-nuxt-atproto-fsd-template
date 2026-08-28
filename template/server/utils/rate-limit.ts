import type { H3Event } from 'h3'

/**
 * Fixed-window request limit, per caller, in memory.
 * Per-process only — a second instance needs to move this to Redis/a database.
 */

interface Window {
  count: number
  resetAt: number
}

const windows = new Map<string, Window>()

/** Sweeps stale entries every Nth call rather than on a timer, so cost scales with load. */
const SWEEP_EVERY = 100
let callsSinceSweep = 0

function sweep(now: number) {
  if (++callsSinceSweep < SWEEP_EVERY) return
  callsSinceSweep = 0

  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key)
  }
}

/**
 * Trusts `x-forwarded-for` because this app only ever runs behind our own
 * proxy (see docs/deployment.md) — exposing Nitro directly would make it
 * caller-controlled. An unidentifiable caller shares one shared bucket.
 */
const callerKey = (event: H3Event) =>
  getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'

/**
 * Counts this request against `name`, throwing 429 past the limit.
 * Windows are fixed, not sliding, so a burst can briefly exceed the limit at a boundary.
 */
export function rateLimit(
  event: H3Event,
  options: { name: string; limit: number; windowMs: number },
): void {
  const now = Date.now()
  sweep(now)

  const key = `${options.name}:${callerKey(event)}`
  const window = windows.get(key)

  if (!window || window.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + options.windowMs })
    return
  }

  window.count += 1

  if (window.count > options.limit) {
    setResponseHeader(event, 'Retry-After', Math.ceil((window.resetAt - now) / 1000))
    throw createError({ statusCode: 429, statusMessage: 'errors.tooManyRequests' })
  }
}

/** Test seam — clears state that otherwise outlives a single request. */
export function resetRateLimits(): void {
  windows.clear()
  callsSinceSweep = 0
}
