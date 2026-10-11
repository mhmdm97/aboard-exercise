import { expect, test } from './fixtures.ts'

test.describe('browsing the library as a visitor', () => {
  test('shows the grid and the result count', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'The Library', level: 1 })).toBeVisible()
    await expect(page.getByRole('article').first()).toBeVisible()
    await expect(page.locator('p[aria-live="polite"]')).toHaveText(/^\d+ books?$/)
  })

  test('search finds a Tolkien book first', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('searchbox', { name: 'Search books' }).fill('tolkien')
    await expect(page).toHaveURL(/[?&]q=tolkien/)
    await expect(page.getByRole('article').first()).toContainText(/tolkien/i)
  })

  test('a genre filter updates the URL and narrows the results', async ({ page }) => {
    await page.goto('/')
    const count = page.locator('p[aria-live="polite"] strong')
    await expect(count).toHaveText(/^\d+$/)
    const before = Number(await count.textContent())

    const genre = page.getByRole('complementary', { name: 'Filters' }).getByRole('group', { name: 'Genres' }).getByRole('button').first()
    await genre.click()

    await expect(page).toHaveURL(/[?&]genre=/)
    await expect(genre).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(async () => Number(await count.textContent())).toBeLessThan(before)
  })

  test('more cards load when scrolling to the end of the grid', async ({ page }) => {
    await page.goto('/')
    const cards = page.getByRole('article')
    await expect(cards.first()).toBeVisible()
    const before = await cards.count()
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect.poll(() => cards.count()).toBeGreaterThan(before)
  })

  test('opening a book shows its detail page', async ({ page }) => {
    await page.goto('/')
    const link = page.getByRole('article').first().getByRole('heading', { level: 2 }).getByRole('link')
    const title = (await link.textContent()) ?? ''
    await link.click()
    await expect(page).toHaveURL(/\/books\/[0-9a-f-]{36}$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
    await expect(page.getByRole('heading', { name: 'About this book' })).toBeVisible()
  })
})
