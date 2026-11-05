import { expect, type Locator, type Page } from '@playwright/test'

/** Open the app on a fresh page and wait until the default selection has rendered. */
export async function openApp(page: Page): Promise<void> {
  await page.goto('/')
  await expect(
    selectedList(page, 'player').getByRole('button', { name: /^Remove / }),
  ).not.toHaveCount(0)
}

export function selectedList(page: Page, singular: 'player' | 'team'): Locator {
  return page.getByRole('list', { name: `Selected ${singular}s` })
}

export function addCard(page: Page, singular: 'player' | 'team' = 'player'): Locator {
  return page.getByRole('button', { name: new RegExp(`^Add ${singular}.*slots open`) })
}

/** Card remove buttons only: the open popover (a dialog) also holds "Remove <name>" buttons. */
export function cardRemoveButtons(list: Locator): Locator {
  return list
    .locator('li')
    .filter({ hasNot: list.page().getByRole('dialog') })
    .getByRole('button', {
      name: /^Remove /,
    })
}

export async function openTable(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Table' }).click()
  await expect(page.getByRole('table', { name: /compared by stat/ })).toBeVisible()
}

export async function expectNoPageHScroll(page: Page): Promise<void> {
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )
  expect(fits).toBe(true)
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, (ch) => `\\${ch}`)
}

/** Parse a table cell's text; null when the cell is not applicable / blank. */
export function parseCell(text: string): number | null {
  if (/not applicable/i.test(text) || text.includes('—')) return null
  const cleaned = text.replace(/[^0-9.-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}
