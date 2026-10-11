import { expect, login, test } from './fixtures.ts'

test('a member favourites a book, sees it in the list and removes it again', async ({ page }) => {
  await login(page, 'member')

  const link = page.getByRole('article').first().getByRole('heading', { level: 2 }).getByRole('link')
  const title = (await link.textContent()) ?? ''
  await link.click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)

  const add = page.getByRole('button', { name: 'Add to favourites' })
  const remove = page.getByRole('button', { name: 'In your favourites' })
  // A previous aborted run could have left it favourited; start from "not a favourite".
  if (await remove.isVisible()) await remove.click()
  await add.click()
  await expect(remove).toBeVisible()

  await page.getByRole('banner').getByRole('link', { name: 'Favourites' }).click()
  await expect(page.getByRole('heading', { name: 'Favourites', level: 1 })).toBeVisible()
  const card = page.getByRole('article').filter({ has: page.getByRole('link', { name: title, exact: true }) })
  await expect(card).toBeVisible()

  await card.getByRole('button', { name: `Favourite ${title}` }).click()
  await expect(card).toHaveCount(0)
})
