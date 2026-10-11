import { expect, login, test } from './fixtures.ts'

test.describe('book management', () => {
  test('an admin creates, edits and deletes a book', async ({ page }) => {
    const title = `E2E Book ${Date.now()}`
    const renamed = `${title} (edited)`
    let bookId: string | undefined

    try {
      await login(page, 'admin')
      await page.getByRole('banner').getByRole('link', { name: 'Add book' }).click()
      await expect(page.getByRole('heading', { name: 'Add a book', level: 1 })).toBeVisible()

      await page.getByLabel('Title', { exact: true }).fill(title)
      await page.getByRole('combobox', { name: 'Author 1' }).fill('E2E Author')
      await page.getByRole('button', { name: 'Create book' }).click()

      await expect(page).toHaveURL(/\/books\/[0-9a-f-]{36}$/)
      bookId = new URL(page.url()).pathname.split('/').pop()
      await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible()
      await expect(page.getByRole('link', { name: 'E2E Author' })).toBeVisible()

      await page.getByRole('link', { name: 'Edit' }).click()
      await expect(page.getByRole('heading', { name: 'Edit book', level: 1 })).toBeVisible()
      await page.getByLabel('Title', { exact: true }).fill(renamed)
      await page.getByRole('button', { name: 'Save changes' }).click()
      await expect(page.getByRole('heading', { name: renamed, level: 1 })).toBeVisible()

      await page.getByRole('button', { name: 'Delete' }).click()
      await page.getByRole('dialog', { name: 'Delete this book?' }).getByRole('button', { name: 'Delete' }).click()
      await expect(page).toHaveURL(/\/$/)
      await expect(page.getByRole('status')).toContainText(`"${renamed}" was deleted.`)
      bookId = undefined
    } finally {
      // Leave the shared database clean even when an assertion above failed half way.
      if (bookId) await page.request.delete(`/api/books/${bookId}`)
    }
  })

  test('a member cannot open the add-book page', async ({ page }) => {
    await login(page, 'member')
    await page.goto('/books/new')
    await expect(page.getByRole('heading', { name: "You don't have access" })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Add a book' })).toHaveCount(0)
  })
})
