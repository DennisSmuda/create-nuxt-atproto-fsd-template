import { defineConfig, devices } from '@playwright/test'
import { AUTH_SECRET, BASE_URL, DATABASE_URL, PORT } from './e2e/env'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  // Plain `nuxt dev` rather than `@nuxt/test-utils`'s Playwright fixture: that
  // fixture drives Nuxt's internal, undocumented `nuxi _dev` command, which
  // hangs after "Nitro server built" against this project's Nuxt 4.5 — never
  // opens the port at all. `nuxt dev` is the public, stable command and
  // starts the same server.
  webServer: {
    command: 'pnpm exec nuxt dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      DATABASE_URL,
      NUXT_AUTH_SECRET: AUTH_SECRET,
      NUXT_AUTH_ORIGIN: `${BASE_URL}/api/auth`,
      APP_ORIGIN: BASE_URL,
      PORT: String(PORT),
      HOST: '127.0.0.1',
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
