import { expect, test, type Page } from '@playwright/test'
import { escapeRegExp, openApp, openTable } from './helpers.js'

/** A sidebar stat group that has an unlocked checked stat and an "Add stat" menu. */
async function firstRemovableStat(page: Page) {
  const sidebar = page.getByRole('complementary', { name: 'Stats' })
  const headings = sidebar.getByRole('heading', { level: 2 })
  await expect(headings.first()).toBeVisible()
  for (const raw of await headings.allTextContents()) {
    const heading = raw.trim()
    const group = sidebar.getByRole('group', { name: heading, exact: true })
    const removable = group.getByRole('checkbox', { checked: true, disabled: false })
    const canAdd = group.getByRole('button', { name: `Add stat to ${heading}` })
    if ((await removable.count()) > 0 && (await canAdd.count()) > 0) {
      const label = await removable.first().evaluate((el) => {
        const input = el as HTMLInputElement
        return input.labels?.[0]?.textContent?.trim() ?? ''
      })
      return { sidebar, label, group, heading }
    }
  }
  throw new Error('no sidebar group has a removable stat and an Add stat menu')
}

function rowFor(page: Page, label: string) {
  return page
    .getByRole('table', { name: /compared by stat/ })
    .getByRole('rowheader', { name: new RegExp(`^${escapeRegExp(label)}\\s*(lower is better)?$`) })
}

test('unchecking a stat removes its table row and adding it back restores it', async ({ page }) => {
  await openApp(page)
  await openTable(page)
  const { sidebar, label, group, heading } = await firstRemovableStat(page)
  expect(label).not.toBe('')
  await expect(rowFor(page, label)).toHaveCount(1)

  await sidebar.getByRole('checkbox', { name: label, exact: true, checked: true }).click()
  await expect(rowFor(page, label)).toHaveCount(0)
  await expect(sidebar.getByRole('checkbox', { name: label, exact: true })).toHaveCount(0)

  await group.getByRole('button', { name: `Add stat to ${heading}` }).click()
  await page
    .getByRole('group', { name: `Stats to add to ${heading}` })
    .getByRole('button', { name: label, exact: true })
    .click()
  await expect(rowFor(page, label)).toHaveCount(1)
  await expect(
    sidebar.getByRole('checkbox', { name: label, exact: true, checked: true }),
  ).toBeVisible()
})

test('adding a stat from the Add stat menu adds a table row', async ({ page }) => {
  await openApp(page)
  await openTable(page)
  const sidebar = page.getByRole('complementary', { name: 'Stats' })
  await sidebar
    .getByRole('button', { name: /^Add stat to / })
    .first()
    .click()
  const menu = sidebar.getByRole('group', { name: /^Stats to add to / })
  const option = menu.getByRole('button').first()
  const label = ((await option.textContent()) ?? '').trim()
  expect(label).not.toBe('')
  await expect(rowFor(page, label)).toHaveCount(0)

  await option.click()
  await expect(rowFor(page, label)).toHaveCount(1)
  await expect(
    sidebar.getByRole('checkbox', { name: label, exact: true, checked: true }),
  ).toBeVisible()
})
