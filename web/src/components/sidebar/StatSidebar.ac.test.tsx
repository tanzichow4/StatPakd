import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DataSource } from '../../dataSource'
import type { EntityKind } from '../../domain/types'
import { AppStateProvider } from '../../state/AppStateProvider'
import {
  createFixtureProvider,
  fixtureSidebarStatDefs,
  fixtureSidebarUiDefaults,
} from '../../test/fixtureProvider'
import { AnnouncerProvider } from '../a11y/Announcer'
import { StatSidebar } from './StatSidebar'

function setup() {
  const defs = fixtureSidebarStatDefs()
  const provider = createFixtureProvider({
    getStatDefs: vi.fn((_l: string, kind: EntityKind) => Promise.resolve(defs[kind])),
  })
  const user = userEvent.setup()
  render(
    <DataSource provider={provider}>
      <AppStateProvider defaults={fixtureSidebarUiDefaults()} statDefs={defs}>
        <AnnouncerProvider>
          <StatSidebar />
        </AnnouncerProvider>
      </AppStateProvider>
    </DataSource>,
  )
  return user
}

const text = () => screen.getByRole('status').textContent ?? ''

async function ready() {
  expect(await screen.findByRole('checkbox', { name: 'Zscore' })).toBeInTheDocument()
}

describe('AC15: stat announcements', () => {
  it('AC15: nothing is announced once the sidebar has loaded', async () => {
    setup()
    await ready()
    expect(text().trim()).toBe('')
  })
  it('AC15: picking from the Add menu announces added with the stat label', async () => {
    const user = setup()
    await ready()
    await user.click(screen.getByRole('button', { name: 'Add stat to zalpha' }))
    await user.click(screen.getByRole('button', { name: 'Zblip' }))
    await waitFor(() => expect(text()).toMatch(/added/i))
    expect(text()).toContain('Zblip')
  })
  it('AC15: opening the Add menu without picking announces nothing', async () => {
    const user = setup()
    await ready()
    await user.click(screen.getByRole('button', { name: 'Add stat to zalpha' }))
    expect(text().trim()).toBe('')
  })
  it('AC15: unchecking a stat announces removed with the stat label', async () => {
    const user = setup()
    await ready()
    await user.click(screen.getByRole('checkbox', { name: 'Zgrit' }))
    await waitFor(() => expect(text()).toMatch(/removed/i))
    expect(text()).toContain('Zgrit')
  })
  it('AC15: re-checking is not possible, so the Add menu announces the re-added stat', async () => {
    const user = setup()
    await ready()
    await user.click(screen.getByRole('checkbox', { name: 'Zgrit' }))
    await user.click(screen.getByRole('button', { name: 'Add stat to zbeta' }))
    await user.click(screen.getByRole('button', { name: 'Zgrit' }))
    await waitFor(() => expect(text()).toMatch(/added/i))
    expect(text()).toContain('Zgrit')
    expect(text()).not.toMatch(/removed/i)
  })
  it('AC15: clicking the locked last stat announces nothing', async () => {
    const user = setup()
    await ready()
    await user.click(screen.getByRole('checkbox', { name: 'Zgrit' }))
    await user.click(screen.getByRole('checkbox', { name: 'Zkilt' }))
    await waitFor(() => expect(text()).toContain('Zkilt'))
    const before = text()
    await user.click(screen.getByRole('checkbox', { name: 'Zscore' }))
    expect(text()).toBe(before)
  })
})
