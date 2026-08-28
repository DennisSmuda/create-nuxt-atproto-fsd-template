import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rateLimit, resetRateLimits } = await import('./rate-limit')

/** An error as `createError` builds it, which is what the route surfaces. */
interface ApiError {
  statusCode: number
  statusMessage: string
}

const from = (ip: string) => ({ ip }) as never

beforeEach(() => {
  resetRateLimits()
  vi.useRealTimers()

  // h3 auto-imports these at runtime; stub them by hand under vitest.
  vi.stubGlobal('getRequestIP', (event: { ip?: string }) => event.ip)
  vi.stubGlobal('setResponseHeader', () => {})
  vi.stubGlobal('createError', (init: ApiError) => Object.assign(new Error(), init))
})

const spend = (ip: string, times: number, limit = 3) => {
  for (let i = 0; i < times; i++) {
    rateLimit(from(ip), { name: 'test', limit, windowMs: 60_000 })
  }
}

describe('rateLimit', () => {
  it('allows requests up to the limit', () => {
    expect(() => spend('1.2.3.4', 3)).not.toThrow()
  })

  it('refuses the one past it, with a 429', () => {
    spend('1.2.3.4', 3)

    try {
      spend('1.2.3.4', 1)
      expect.unreachable('the fourth request should have been refused')
    } catch (err) {
      expect((err as ApiError).statusCode).toBe(429)
      expect((err as ApiError).statusMessage).toBe('errors.tooManyRequests')
    }
  })

  it('counts each caller separately', () => {
    spend('1.2.3.4', 3)

    expect(() => spend('5.6.7.8', 3)).not.toThrow()
  })

  it('counts each named limit separately', () => {
    spend('1.2.3.4', 3)

    expect(() =>
      rateLimit(from('1.2.3.4'), { name: 'other', limit: 3, windowMs: 60_000 }),
    ).not.toThrow()
  })

  it('lets the caller back in once the window has passed', () => {
    vi.useFakeTimers()
    spend('1.2.3.4', 3)
    expect(() => spend('1.2.3.4', 1)).toThrow()

    vi.advanceTimersByTime(60_001)

    expect(() => spend('1.2.3.4', 3)).not.toThrow()
  })

  it('puts callers it cannot identify in one shared bucket', () => {
    const anonymous = {} as never
    for (let i = 0; i < 3; i++) {
      rateLimit(anonymous, { name: 'test', limit: 3, windowMs: 60_000 })
    }

    expect(() =>
      rateLimit({} as never, { name: 'test', limit: 3, windowMs: 60_000 }),
    ).toThrow()
  })
})
