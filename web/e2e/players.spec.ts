import { expect, test, type Page } from '@playwright/test'
import { expectNoPageHScroll, openApp } from './helpers.js'

async function openWeeks(page: Page): Promise<void> {
  await openApp(page)
  await page
    .getByRole('group', { name: 'Player view' })
    .getByRole('button', { name: 'Week to week' })
    .click()
  await expect(page.getByRole('group', { name: 'Weekly dot graph' })).toBeVisible()
}

const combobox = (page: Page, name: string) => page.getByRole('combobox', { name })

test('week to week compares the selected players, with totals for the chosen weeks', async ({
  page,
}) => {
  await openWeeks(page)
  const totals = page.getByRole('complementary', { name: 'Totals' })
  await expect(totals).toContainText('18 weeks chosen')
  await expectNoPageHScroll(page)

  await page.getByRole('button', { name: 'Last 4' }).click()
  await expect(totals).toContainText('4 weeks chosen')
  const table = page.getByRole('table', { name: /by week and player$/ })
  // Four week rows, plus the header and total rows.
  await expect(table.getByRole('row')).toHaveCount(6)
  await expectNoPageHScroll(page)
})

test('a week range limits one player to those weeks', async ({ page }) => {
  await openWeeks(page)
  const list = page.getByRole('list', { name: 'Selected players' })
  while ((await list.getByRole('button', { name: /^Remove / }).count()) > 1) {
    await list
      .getByRole('button', { name: /^Remove / })
      .last()
      .click()
  }
  await combobox(page, 'First week').selectOption('3')
  await combobox(page, 'Last week').selectOption('5')
  const table = page.getByRole('table', { name: /week by week$/ })
  await expect(table.getByRole('row')).toHaveCount(5)
  await expectNoPageHScroll(page)
})

test('the weekly dot graph can compare one stat against another', async ({ page }) => {
  await openWeeks(page)
  await page.getByRole('button', { name: 'Stat vs stat' }).click()
  await combobox(page, 'Weekly X axis').selectOption({ label: 'Snaps' })
  await combobox(page, 'Weekly Y axis').selectOption({ label: 'Scrimmage Yds' })
  const graph = page.getByRole('group', { name: 'Weekly dot graph' })
  await expect(graph.getByTestId('x-title')).toHaveText('Snaps')
  await expect(graph.getByTestId('y-title')).toHaveText('Scrimmage Yds')
  await expect(graph.getByTestId('dot').first()).toBeVisible()
  await expectNoPageHScroll(page)
})

test('the season dot graph uses an x axis alone or two stats', async ({ page }) => {
  await openApp(page)
  await page.getByRole('tab', { name: '2D chart' }).click()
  await page.getByRole('button', { name: 'Dot graph', exact: true }).click()
  const graph = page.getByRole('group', { name: 'Dot graph' })
  await expect(graph.getByTestId('y-tick')).toHaveCount(3)
  await expectNoPageHScroll(page)

  await combobox(page, 'Graph X axis').selectOption({ label: 'Snaps' })
  await combobox(page, 'Graph Y axis').selectOption({ label: 'Scrimmage Yds' })
  await expect(graph.getByTestId('league-dot').first()).toBeVisible()
  await expect(graph.getByTestId('dot')).toHaveCount(3)
  await expectNoPageHScroll(page)
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
