import { expect, test } from '@playwright/test'
import { addCard, cardRemoveButtons, openApp, selectedList } from './helpers.js'

test('adding players stops at 8 and removing one reopens a slot', async ({ page }) => {
  await openApp(page)
  const list = selectedList(page, 'player')
  const dialog = page.getByRole('dialog', { name: 'Add player' })

  await expect(addCard(page)).toContainText('5 of 8 slots open')
  await addCard(page).click()
  await expect(dialog).toBeVisible()

  for (let open = 4; open >= 1; open--) {
    await dialog.getByRole('button', { name: /^Add / }).first().click()
    await expect(addCard(page)).toContainText(`${open} of 8 slots open`)
  }
  await dialog.getByRole('button', { name: /^Add / }).first().click()

  // Full: the Add card and popover are gone, so no further player can be added.
  await expect(addCard(page)).toHaveCount(0)
  await expect(dialog).toHaveCount(0)
  await expect(cardRemoveButtons(list)).toHaveCount(8)

  await cardRemoveButtons(list).first().click()
  await expect(cardRemoveButtons(list)).toHaveCount(7)
  await expect(addCard(page)).toContainText('1 of 8 slots open')
})

test('removing a player from inside the add popover frees a slot', async ({ page }) => {
  await openApp(page)
  const list = selectedList(page, 'player')
  const dialog = page.getByRole('dialog', { name: 'Add player' })

  await addCard(page).click()
  await dialog
    .getByRole('button', { name: /^Remove / })
    .first()
    .click()
  await expect(addCard(page)).toContainText('6 of 8 slots open')

  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(cardRemoveButtons(list)).toHaveCount(2)
})
