import { expect, test } from '@playwright/test'
import { signInAs } from './auth'
import { SEED_USERS } from './seed-users'

test('a seeded user lands signed in without going through login', async ({
  context,
  page,
}) => {
  await signInAs(context, SEED_USERS[0])

  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: `Signed in as ${SEED_USERS[0].email}` }),
  ).toBeVisible()
})
