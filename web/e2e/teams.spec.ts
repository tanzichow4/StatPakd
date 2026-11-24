import { expect, test, type Page } from '@playwright/test'
import { expectNoPageHScroll, openApp, parseCell } from './helpers.js'

async function openBreakdown(page: Page): Promise<void> {
  await openApp(page)
  await page
    .getByRole('group', { name: 'Players or teams' })
    .getByRole('button', { name: 'Teams' })
    .click()
  await page
    .getByRole('group', { name: 'Team view' })
    .getByRole('button', { name: 'Team breakdown' })
    .click()
  await expect(page.getByRole('region', { name: 'Roster table' })).toBeVisible()
}

function rosterTable(page: Page) {
  return page.getByRole('table', { name: 'Roster' })
}

/** Column header names in the roster table, excluding the Player column. */
async function statColumns(page: Page): Promise<string[]> {
  const headers = await rosterTable(page).getByRole('columnheader').allTextContents()
  return headers.slice(1).map((text) => text.trim())
}

test('team breakdown shows chips, header, share and roster, and switching team updates the header', async ({
  page,
}) => {
  await openBreakdown(page)
  const chips = page.getByRole('group', { name: 'Teams', exact: true })
  const header = page.getByRole('main').getByRole('heading', { level: 2 }).first()

  await expect(chips).toBeVisible()
  await expect(chips.getByRole('button')).not.toHaveCount(0)
  await expect(chips.getByRole('button', { pressed: true })).toHaveCount(1)
  await expect(header).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Share of team production' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Roster table' })).toBeVisible()

  const before = await header.textContent()
  await chips.getByRole('button', { pressed: false }).first().click()
  await expect(chips.getByRole('button', { pressed: true })).toHaveCount(1)
  await expect(header).not.toHaveText(before ?? '')

  await expectNoPageHScroll(page)
})

test('switching Offense and Defense changes the roster columns', async ({ page }) => {
  await openBreakdown(page)
  const unit = page.getByRole('group', { name: 'Unit' })
  const defense = unit.getByRole('button', { name: 'Defense' })
  await expect(unit.getByRole('button', { name: 'Offense' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  const offenseColumns = await statColumns(page)
  expect(offenseColumns.length).toBeGreaterThan(0)

  await defense.click()
  await expect(defense).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => statColumns(page)).not.toEqual(offenseColumns)
})

test('clicking a roster column sorts descending then ascending with blanks last', async ({
  page,
}) => {
  await openBreakdown(page)
  const table = rosterTable(page)
  const headers = table.getByRole('columnheader')
  const firstUnsorted = headers.and(page.locator('[aria-sort="none"]')).first()
  await expect(firstUnsorted).toBeVisible()
  const index = await firstUnsorted.evaluate((el) =>
    Array.from(el.parentElement?.children ?? []).indexOf(el),
  )
  expect(index).toBeGreaterThan(0)
  // Pinned by position: the "unsorted" filter would move to another column after the first click.
  const unsorted = headers.nth(index)

  const column = async (): Promise<(number | null)[]> => {
    const rows = await table.getByRole('row').all()
    const texts = await Promise.all(
      rows.slice(1).map((row) =>
        row
          .getByRole('cell')
          .nth(index - 1)
          .textContent(),
      ),
    )
    return texts.map((text) => parseCell(text ?? ''))
  }
  // Nulls only at the end, and the numbers before them ordered by `dir`.
  const ordered = (values: (number | null)[], dir: 1 | -1): boolean => {
    const firstNull = values.indexOf(null)
    const numbers = firstNull === -1 ? values : values.slice(0, firstNull)
    const tail = firstNull === -1 ? [] : values.slice(firstNull)
    if (tail.some((value) => value !== null)) return false
    return numbers.every(
      (value, i) => i === 0 || dir * ((value as number) - (numbers[i - 1] as number)) >= 0,
    )
  }

  const sortButton = unsorted.getByRole('button')
  await sortButton.click()
  await expect(unsorted).toHaveAttribute('aria-sort', 'descending')
  await expect.poll(async () => ordered(await column(), -1)).toBe(true)
  expect((await column()).filter((value) => value !== null).length).toBeGreaterThan(1)

  await sortButton.click()
  await expect(unsorted).toHaveAttribute('aria-sort', 'ascending')
  await expect.poll(async () => ordered(await column(), 1)).toBe(true)

  await expectNoPageHScroll(page)
})
