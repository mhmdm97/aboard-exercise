import { expect, test as base, type Page } from '@playwright/test'

export const accounts = {
  admin: { email: 'admin@library.local', password: 'Admin123!', name: 'Ada Admin', role: 'admin' },
  member: { email: 'member@library.local', password: 'Member123!', name: 'Max Member', role: 'member' },
} as const

/** Every test gets a context where cover images from the internet 404 (the UI falls back to a placeholder). */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route(/^https?:\/\/([^/]+\.)?(openlibrary|archive)\.org\//, (route) =>
      route.fulfill({ status: 404, body: '' }),
    )
    await use(context)
  },
})

export { expect }

/** Logs in through the real form and waits until the header shows the user. */
export async function login(page: Page, role: keyof typeof accounts) {
  const account = accounts[role]
  await page.goto('/login')
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Password', { exact: true }).fill(account.password)
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible()
}
