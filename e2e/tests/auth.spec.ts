import { accounts, expect, login, test } from './fixtures.ts'

test.describe('authentication', () => {
  // Guards the dev/preview-proxy regression: the proxy must keep the browser's Host so the Origin check passes.
  test('a member logs in through the form and logs out', async ({ page }) => {
    await login(page, 'member')
    const header = page.getByRole('banner')
    await expect(header.getByText(accounts.member.name)).toBeVisible()
    await expect(header.getByText(accounts.member.role, { exact: true })).toBeVisible()
    await expect(header.getByRole('link', { name: 'Favourites' })).toBeVisible()

    await header.getByRole('button', { name: 'Log out' }).click()
    await expect(header.getByRole('link', { name: 'Log in' })).toBeVisible()
    await expect(header.getByText(accounts.member.name)).toHaveCount(0)
  })

  test('a wrong password shows an error and stays logged out', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(accounts.member.email)
    await page.getByLabel('Password', { exact: true }).fill('not-the-password')
    await page.getByRole('button', { name: 'Log in', exact: true }).click()

    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('banner').getByRole('link', { name: 'Log in' })).toBeVisible()
  })
})
