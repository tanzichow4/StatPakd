import { expect, test } from '@playwright/test'
import { expectNoPageHScroll, openApp, selectedList } from './helpers.js'

test('each view tab shows its chart and hides the previous one', async ({ page }) => {
  await openApp(page)
  const tab = (name: string) => page.getByRole('tab', { name })
  const table = page.getByRole('table', { name: /compared by stat/ })
  const chart3d = page.getByRole('group', { name: '3D chart' })
  const bars = page.getByRole('group', { name: 'Bars chart' })
  const radar = page.getByRole('group', { name: 'Radar chart' })
  const removeButtons = selectedList(page, 'player').getByRole('button', { name: /^Remove / })
  // Bars show a short form of each name, so match on the surname (last word of the full name).
  const surnames = await removeButtons.evaluateAll((els) =>
    els.map((el) => (el.getAttribute('aria-label') ?? '').trim().split(/\s+/).pop() ?? ''),
  )
  const cardCount = surnames.length

  // The app opens on the 3D chart.
  await expect(chart3d).toBeVisible()
  await expect(tab('3D chart')).toHaveAttribute('aria-selected', 'true')

  await tab('Table').click()
  await expect(table).toBeVisible()
  await expect(chart3d).toBeHidden()
  await expect(tab('Table')).toHaveAttribute('aria-selected', 'true')
  await expect(tab('3D chart')).toHaveAttribute('aria-selected', 'false')

  await tab('2D chart').click()
  await expect(tab('2D chart')).toHaveAttribute('aria-selected', 'true')
  await expect(bars).toBeVisible()
  await expect(table).toBeHidden()
  const firstBarRow = bars.getByRole('group').first()
  await expect(firstBarRow.getByRole('listitem')).toHaveCount(cardCount)
  for (const name of surnames) {
    await expect(firstBarRow.getByRole('listitem').filter({ hasText: name })).not.toHaveCount(0)
  }

  const chartType = page.getByRole('button', { name: 'Radar', exact: true })
  await chartType.click()
  await expect(chartType).toHaveAttribute('aria-pressed', 'true')
  await expect(radar).toBeVisible()
  await expect(bars).toBeHidden()
  await expect(page.getByRole('list', { name: 'Legend' }).getByRole('listitem')).toHaveCount(
    cardCount,
  )

  await tab('3D chart').click()
  await expect(tab('3D chart')).toHaveAttribute('aria-selected', 'true')
  await expect(chart3d).toBeVisible()
  await expect(radar).toBeHidden()

  await expectNoPageHScroll(page)
})

test('dragging the 3D chart rotates the points and Reset view restores them', async ({ page }) => {
  await openApp(page)
  const chart = page.getByRole('group', { name: '3D chart' })
  await expect(chart).toBeVisible()
  // The plotted points are aria-hidden SVG marks with no accessible role, so a test id is used.
  const dot = page.getByTestId('point').first().locator('circle')
  const position = async () => [await dot.getAttribute('cx'), await dot.getAttribute('cy')]
  const initial = await position()
  expect(initial[0]).not.toBeNull()

  await chart.scrollIntoViewIfNeeded()
  const box = await chart.boundingBox()
  if (!box) throw new Error('3D chart has no bounding box')
  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + 120, startY + 40, { steps: 10 })
  await page.mouse.up()
  await expect.poll(position).not.toEqual(initial)

  await page.getByRole('button', { name: 'Reset view' }).click()
  await expect.poll(position).toEqual(initial)
})
