import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DataSource } from '../../dataSource'
import { AppStateProvider } from '../../state/AppStateProvider'
import { entitiesProvider, fixtureStatDefs, fixtureUiDefaults } from '../../test/fixtureProvider'
import { AnnouncerProvider } from '../a11y/Announcer'
import { EntityPicker } from './EntityPicker'

function setup() {
  const user = userEvent.setup()
  render(
    <DataSource provider={entitiesProvider()}>
      <AppStateProvider defaults={fixtureUiDefaults()} statDefs={fixtureStatDefs()}>
        <AnnouncerProvider>
          <EntityPicker />
        </AnnouncerProvider>
      </AppStateProvider>
    </DataSource>,
  )
  return user
}

const region = () => screen.getByRole('status')
const text = () => region().textContent ?? ''
const dialog = () => screen.getByRole('dialog')

async function ready() {
  const cards = screen.getByRole('list', { name: /^Selected/ })
  expect(await within(cards).findByText('Ola Quenby')).toBeInTheDocument()
}

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^Add (player|team)/ }))
  expect(dialog()).toBeInTheDocument()
}

describe('AC15: entity announcements', () => {
  it('AC15: the live region exists, is polite and is empty after load', async () => {
    setup()
    await ready()
    expect(region()).toHaveAttribute('aria-live', 'polite')
    expect(text().trim()).toBe('')
  })
  it('AC15: opening and closing the popover announces nothing', async () => {
    const user = setup()
    await ready()
    await open(user)
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(text().trim()).toBe('')
  })
  it('AC15: adding from the popover announces added with the entity name', async () => {
    const user = setup()
    await ready()
    await open(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Add Quill Dorvane' }))
    await waitFor(() => expect(text()).toMatch(/added/i))
    expect(text()).toContain('Quill Dorvane')
  })
  it('AC15: removing from the popover announces removed with the entity name', async () => {
    const user = setup()
    await ready()
    await open(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Remove Ola Quenby' }))
    await waitFor(() => expect(text()).toMatch(/removed/i))
    expect(text()).toContain('Ola Quenby')
  })
  it('AC15: removing by the card x announces removed with the entity name', async () => {
    const user = setup()
    await ready()
    await user.click(screen.getByRole('button', { name: 'Remove Pim Rastow' }))
    await waitFor(() => expect(text()).toMatch(/removed/i))
    expect(text()).toContain('Pim Rastow')
  })
  it('AC15: the message follows the latest action', async () => {
    const user = setup()
    await ready()
    await open(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Add Quill Dorvane' }))
    await waitFor(() => expect(text()).toContain('Quill Dorvane'))
    await user.click(within(dialog()).getByRole('button', { name: 'Remove Ola Quenby' }))
    await waitFor(() => expect(text()).toContain('Ola Quenby'))
    expect(text()).not.toContain('Quill Dorvane')
    expect(text()).toMatch(/removed/i)
  })
  it('AC15: only one live region exists', async () => {
    setup()
    await ready()
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })
})

describe('AC9: focus stays inside the popover when removing from it', () => {
  it('AC9: removing from the popover keeps focus inside the dialog', async () => {
    const user = setup()
    await ready()
    await open(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Remove Ola Quenby' }))
    expect(document.activeElement).not.toBe(document.body)
    expect(dialog().contains(document.activeElement)).toBe(true)
  })
  it('AC9: adding from the popover keeps focus inside the dialog', async () => {
    const user = setup()
    await ready()
    await open(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Add Quill Dorvane' }))
    expect(document.activeElement).not.toBe(document.body)
    expect(dialog().contains(document.activeElement)).toBe(true)
  })
})
