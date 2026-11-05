import { expect, test } from '@playwright/test'

test('the app loads and shows its heading and the Players/Teams navigation', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'StatPakd' })).toBeAttached()
  const nav = page.getByRole('group', { name: 'Players or teams' })
  await expect(nav).toBeVisible()
  await expect(nav.getByRole('button', { name: 'Players' })).toHaveAttribute('aria-pressed', 'true')
})
