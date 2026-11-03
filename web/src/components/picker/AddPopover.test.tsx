import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Entity, EntityKind } from '../../domain/types'
import { ALL_POSITIONS, MAX_SELECTED } from '../../state'
import { fixturePlayers, fixtureTeams } from '../../test/fixtureProvider'
import { AddPopover } from './AddPopover'
import { positionChips } from './filterEntities'

type PopoverProps = Parameters<typeof AddPopover>[0]

function makeProps(overrides: Partial<PopoverProps> = {}): PopoverProps {
  const results = fixturePlayers()
  return {
    id: 'pop',
    kind: 'players',
    results,
    chips: positionChips(results),
    q: '',
    pos: ALL_POSITIONS,
    selectedIds: ['zp1', 'zp2'],
    full: false,
    onQuery: vi.fn(),
    onPos: vi.fn(),
    onToggleEntity: vi.fn(),
    onDone: vi.fn(),
    onEscape: vi.fn(),
    ...overrides,
  } as PopoverProps
}

function setup(overrides: Partial<PopoverProps> = {}) {
  const props = makeProps(overrides)
  const view = render(<AddPopover {...props} />)
  return { props, ...view }
}

const resultsList = () => screen.getByRole('list', { name: 'Results' })
const rows = () => within(resultsList()).getAllByRole('listitem')

describe('AC12: dialog and autofocus', () => {
  it('AC12: renders a dialog labelled for the kind', () => {
    setup()
    expect(screen.getByRole('dialog', { name: 'Add player' })).toBeInTheDocument()
  })
  it('AC12: a teams popover is labelled Add team', () => {
    setup({ kind: 'teams', results: fixtureTeams(), chips: null })
    expect(screen.getByRole('dialog', { name: 'Add team' })).toBeInTheDocument()
  })
  it('AC12: the dialog carries the given id', () => {
    setup({ id: 'my-pop' })
    expect(screen.getByRole('dialog')).toHaveAttribute('id', 'my-pop')
  })
  it('AC12: the search input has focus as soon as it mounts', () => {
    setup()
    expect(screen.getByRole('searchbox', { name: 'Search players' })).toHaveFocus()
  })
  it('AC12: the teams search input is also focused on mount', () => {
    setup({ kind: 'teams', results: fixtureTeams(), chips: null })
    expect(screen.getByRole('searchbox', { name: 'Search teams' })).toHaveFocus()
  })
})

describe('AC13: search input', () => {
  const placeholders: [EntityKind, string][] = [
    ['players', 'Search players or team'],
    ['teams', 'Search teams'],
  ]
  it.each(placeholders)('AC13: the %s placeholder is "%s"', (kind, placeholder) => {
    setup({
      kind,
      results: kind === 'players' ? fixturePlayers() : fixtureTeams(),
      chips: kind === 'players' ? [ALL_POSITIONS] : null,
    })
    expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument()
  })
  it('AC13: shows the given query', () => {
    setup({ q: 'abc' })
    expect(screen.getByRole('searchbox')).toHaveValue('abc')
  })
  it('AC13: typing reports each keystroke to onQuery', async () => {
    const user = userEvent.setup()
    const { props } = setup()
    await user.keyboard('ab')
    expect(props.onQuery).toHaveBeenCalledTimes(2)
    expect(props.onQuery).toHaveBeenNthCalledWith(1, 'a')
  })
})

describe('AC15: position chips', () => {
  it('AC15: shows one chip per entry in chips, in order', () => {
    setup()
    const group = screen.getByRole('group', { name: 'Filter by position' })
    const labels = within(group)
      .getAllByRole('button')
      .map((b) => b.textContent)
    expect(labels).toEqual([ALL_POSITIONS, 'ZA', 'ZB', 'ZC'])
  })
  it('AC15: shows no chips for teams (chips null)', () => {
    setup({ kind: 'teams', results: fixtureTeams(), chips: null })
    expect(screen.queryByRole('group', { name: 'Filter by position' })).not.toBeInTheDocument()
  })
})

describe('AC16: chip state', () => {
  it('AC16: only the active chip has aria-pressed true', () => {
    setup({ pos: 'ZB' })
    const pressed = screen.getAllByRole('button', { pressed: true }).map((b) => b.textContent)
    expect(pressed).toEqual(['ZB'])
    expect(screen.getByRole('button', { name: ALL_POSITIONS })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
  it('AC16: All is pressed when pos is All', () => {
    setup()
    expect(screen.getByRole('button', { name: ALL_POSITIONS })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
  it('AC16: clicking a chip calls onPos with its label', async () => {
    const user = userEvent.setup()
    const { props } = setup()
    await user.click(screen.getByRole('button', { name: 'ZC' }))
    expect(props.onPos).toHaveBeenCalledWith('ZC')
  })
  it('AC16: a chip can be toggled with Space', async () => {
    const user = userEvent.setup()
    const { props } = setup()
    screen.getByRole('button', { name: 'ZA' }).focus()
    await user.keyboard(' ')
    expect(props.onPos).toHaveBeenCalledWith('ZA')
  })
})

describe('AC17: result rows', () => {
  it('AC17: shows one row per result with tile, name and meta', () => {
    const results = fixturePlayers().slice(0, 3)
    setup({ results })
    const list = rows()
    expect(list).toHaveLength(3)
    expect(list[0]).toHaveTextContent('Ola Quenby')
    expect(list[0]).toHaveTextContent(results[0].meta)
    expect(list[0]).toHaveTextContent(results[0].badge)
  })
  it('AC17: unselected rows offer Add and selected rows offer Remove', () => {
    setup({ results: fixturePlayers().slice(0, 3), selectedIds: ['zp1'] })
    const [first, second] = rows()
    expect(within(first).getByRole('button', { name: 'Remove Ola Quenby' })).toHaveTextContent(
      'Remove',
    )
    expect(within(second).getByRole('button', { name: 'Add Pim Rastow' })).toHaveTextContent('Add')
  })
  it('AC17: the CTA calls onToggleEntity with the entity id', async () => {
    const user = userEvent.setup()
    const { props } = setup()
    await user.click(screen.getByRole('button', { name: 'Add Quill Dorvane' }))
    expect(props.onToggleEntity).toHaveBeenCalledWith('zp3')
    await user.click(screen.getByRole('button', { name: 'Remove Ola Quenby' }))
    expect(props.onToggleEntity).toHaveBeenCalledWith('zp1')
  })
  it('AC17: keeps provider order of results', () => {
    setup()
    const names = rows().map((r) => within(r).getByRole('button').getAttribute('aria-label'))
    expect(names[0]).toBe('Remove Ola Quenby')
    expect(names[9]).toBe('Add Xan Pellum')
  })
  it('AC17: a controlled wrapper flips the CTA when the selection changes', async () => {
    const user = userEvent.setup()
    function Wrapper() {
      const [sel, setSel] = useState<string[]>([])
      const base = makeProps({ results: fixturePlayers().slice(0, 2), selectedIds: sel })
      return (
        <AddPopover
          {...base}
          onToggleEntity={(id) =>
            setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
          }
        />
      )
    }
    render(<Wrapper />)
    await user.click(screen.getByRole('button', { name: 'Add Ola Quenby' }))
    expect(screen.getByRole('button', { name: 'Remove Ola Quenby' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add Ola Quenby' })).not.toBeInTheDocument()
  })
})

describe('AC18: full selection', () => {
  const eight = fixturePlayers()
    .slice(0, MAX_SELECTED)
    .map((p) => p.id)
  it('AC18: with 8 selected every Add is natively disabled', () => {
    setup({ selectedIds: eight, full: true })
    const adds = screen.getAllByRole('button', { name: /^Add (?!player)/ })
    expect(adds).toHaveLength(2)
    expect(adds.every((b) => (b as HTMLButtonElement).disabled)).toBe(true)
  })
  it('AC18: with 8 selected every Remove stays enabled', () => {
    setup({ selectedIds: eight, full: true })
    const removes = screen.getAllByRole('button', { name: /^Remove / })
    expect(removes).toHaveLength(MAX_SELECTED)
    expect(removes.every((b) => (b as HTMLButtonElement).disabled)).toBe(false)
  })
  it('AC18: a disabled Add does not call onToggleEntity', async () => {
    const user = userEvent.setup()
    const { props } = setup({ selectedIds: eight, full: true })
    await user.click(screen.getByRole('button', { name: 'Add Xan Pellum' }))
    expect(props.onToggleEntity).not.toHaveBeenCalled()
  })
  it('AC18: a Remove still calls onToggleEntity when full', async () => {
    const user = userEvent.setup()
    const { props } = setup({ selectedIds: eight, full: true })
    await user.click(screen.getByRole('button', { name: 'Remove Ola Quenby' }))
    expect(props.onToggleEntity).toHaveBeenCalledWith('zp1')
  })
  it('AC18: when not full, Add buttons are enabled', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Add Xan Pellum' })).toBeEnabled()
  })
})

describe('AC20: empty results', () => {
  it('AC20: shows "No matches." and no rows when results is empty', () => {
    setup({ results: [] })
    expect(screen.getByText('No matches.')).toBeInTheDocument()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })
  it('AC20: does not show "No matches." when there are results', () => {
    setup()
    expect(screen.queryByText('No matches.')).not.toBeInTheDocument()
  })
  it('AC20: chips stay visible alongside the empty message for players', () => {
    setup({ results: [] })
    expect(screen.getByRole('group', { name: 'Filter by position' })).toBeInTheDocument()
  })
})

describe('AC21: scrolling results', () => {
  it('AC21: the results list sits in the popover with every row present', () => {
    setup()
    expect(rows()).toHaveLength(10)
    expect(within(screen.getByRole('dialog')).getByRole('list', { name: 'Results' })).toBe(
      resultsList(),
    )
  })
})

describe('AC22: closing', () => {
  it('AC22: Done calls onDone', async () => {
    const user = userEvent.setup()
    const { props } = setup()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(props.onDone).toHaveBeenCalledTimes(1)
  })
  it('AC22: Enter on Done calls onDone', async () => {
    const user = userEvent.setup()
    const { props } = setup()
    screen.getByRole('button', { name: 'Done' }).focus()
    await user.keyboard('{Enter}')
    expect(props.onDone).toHaveBeenCalledTimes(1)
  })
  it('AC22: Escape in the search input calls onEscape', async () => {
    const user = userEvent.setup()
    const { props } = setup()
    await user.keyboard('{Escape}')
    expect(props.onEscape).toHaveBeenCalledTimes(1)
  })
  it('AC22: Escape on a chip or a CTA calls onEscape', async () => {
    const user = userEvent.setup()
    const { props } = setup()
    screen.getByRole('button', { name: 'ZA' }).focus()
    await user.keyboard('{Escape}')
    screen.getByRole('button', { name: 'Add Quill Dorvane' }).focus()
    await user.keyboard('{Escape}')
    expect(props.onEscape).toHaveBeenCalledTimes(2)
  })
  it('AC22: Escape does not bubble to ancestors', async () => {
    const user = userEvent.setup()
    const outer = vi.fn()
    const props = makeProps()
    render(
      <div role="presentation" onKeyDown={(e) => e.key === 'Escape' && outer()}>
        <AddPopover {...props} />
      </div>,
    )
    await user.keyboard('{Escape}')
    expect(props.onEscape).toHaveBeenCalledTimes(1)
    expect(outer).not.toHaveBeenCalled()
  })
  it('AC22: other keys do not call onEscape', async () => {
    const user = userEvent.setup()
    const { props } = setup()
    await user.keyboard('a{Enter}')
    expect(props.onEscape).not.toHaveBeenCalled()
  })
})

describe('AC35: shiftLeft', () => {
  it('AC35: shiftLeft moves the dialog left by that many pixels', () => {
    setup({ shiftLeft: 88 })
    expect(screen.getByRole('dialog').style.left).toBe('-88px')
  })
  it('AC35: without shiftLeft there is no negative offset', () => {
    setup()
    expect(screen.getByRole('dialog').style.left).not.toMatch(/^-/)
  })
})

describe('AC28: native controls', () => {
  it('AC28: every interactive element is a native button or input', () => {
    setup()
    const dialog = screen.getByRole('dialog')
    const interactive = [
      ...within(dialog).getAllByRole('button'),
      ...within(dialog).getAllByRole('searchbox'),
    ]
    expect(interactive.every((el) => ['BUTTON', 'INPUT'].includes(el.tagName))).toBe(true)
  })
  it('AC28: selected entities from a different list do not break rendering', () => {
    const stranger: Entity[] = []
    setup({ results: stranger, selectedIds: ['unknown'] })
    expect(screen.getByText('No matches.')).toBeInTheDocument()
  })
})
