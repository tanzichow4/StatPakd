import { expect, test, type Page } from '@playwright/test'
import { expectNoPageHScroll, openApp } from './helpers.js'

async function openDetail(page: Page): Promise<void> {
  await openApp(page)
  await page
    .getByRole('group', { name: 'Player view' })
    .getByRole('button', { name: 'Player detail' })
    .click()
  await expect(page.getByRole('table', { name: 'Game log' })).toBeVisible()
}

const weekChip = (page: Page, week: number) =>
  page
    .getByRole('group', { name: 'Weeks to compare' })
    .getByRole('button', { name: `Week ${week}`, exact: true })

test('the dot plot shows one scale for each selected stat', async ({ page }) => {
  await openApp(page)
  await page.getByRole('tab', { name: '2D chart' }).click()
  const bars = page.getByRole('group', { name: 'Bars chart' })
  const statCount = await bars.getByRole('group').count()
  await page.getByRole('button', { name: 'Dot plot', exact: true }).click()
  const plot = page.getByRole('group', { name: 'Dot plot' })
  await expect(plot.getByRole('group')).toHaveCount(statCount)
  await expect(bars).toBeHidden()
  await expectNoPageHScroll(page)
})

test('picking weeks 1, 2 and 3 compares them as dot plots and as a table', async ({ page }) => {
  await openDetail(page)
  await expectNoPageHScroll(page)
  for (const week of [1, 2, 3]) await weekChip(page, week).click()
  const table = page.getByRole('table', { name: 'Chosen weeks compared by stat' })
  await expect(table.getByRole('columnheader')).toHaveCount(4)
  await expect(page.getByTestId('week-trend').first()).toContainText('W1 to W3')
  await expectNoPageHScroll(page)
})

test('clicking a week on the season chart adds it to the comparison', async ({ page }) => {
  await openDetail(page)
  const dot = page.getByRole('button', { name: /^Week 2:/ })
  await dot.click()
  await expect(dot).toHaveAttribute('aria-pressed', 'true')
  await expect(weekChip(page, 2)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('checkbox', { name: 'Week 2' })).toBeChecked()
})

test('the 3D chart has flat views and shows values for a tapped dot', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: 'Top', exact: true }).click()
  await expect(page.getByTestId('axis-tick')).toHaveCount(6)

  // The dots are aria-hidden SVG marks drawn last for selected players, so a test id is used.
  const dot = page.getByTestId('point').last().locator('circle')
  await dot.scrollIntoViewIfNeeded()
  const box = await dot.boundingBox()
  if (!box) throw new Error('3D dot has no bounding box')
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.getByTestId('point-tooltip')).toBeVisible()

  await page.getByRole('button', { name: '3D', exact: true }).click()
  await expect(page.getByTestId('axis-tick')).toHaveCount(9)
  await expectNoPageHScroll(page)
})
