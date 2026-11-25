import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fixtureTeams } from '../../test/fixtureProvider'
import { TeamChips } from './TeamChips'

function setup(activeId: string, teams = fixtureTeams()) {
  const onSelect = vi.fn()
  const user = userEvent.setup()
  render(<TeamChips teams={teams} activeId={activeId} onSelect={onSelect} />)
  return { onSelect, user }
}

const chips = () => within(screen.getByRole('group', { name: 'Teams' })).getAllByRole('button')

describe('AC11: one chip per team', () => {
  it('AC11: renders a chip per team in provider order labelled by badge', () => {
    setup('zt1')
    expect(chips().map((c) => c.textContent)).toEqual(['ZQA', 'ZQB', 'ZQC', 'ZQD'])
  })
  it('AC11: follows the given order, not an alphabetical one', () => {
    setup('zt1', fixtureTeams().reverse())
    expect(chips().map((c) => c.textContent)).toEqual(['ZQD', 'ZQC', 'ZQB', 'ZQA'])
  })
  it('AC11: chips use the mono font', () => {
    setup('zt1')
    for (const c of chips()) expect(c).toHaveClass('mono')
  })
  it('AC11: an empty list renders no chips and does not throw', () => {
    setup('zt1', [])
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})

describe('AC12: the active chip', () => {
  it('AC12: the group is named Teams', () => {
    setup('zt1')
    expect(screen.getByRole('group', { name: 'Teams' })).toBeInTheDocument()
  })
  it('AC12: only the chip matching activeId is pressed', () => {
    setup('zt3')
    expect(chips().map((c) => c.getAttribute('aria-pressed'))).toEqual([
      'false',
      'false',
      'true',
      'false',
    ])
  })
  it('AC19: an unknown activeId presses no chip', () => {
    setup('nope')
    expect(chips().map((c) => c.getAttribute('aria-pressed'))).toEqual([
      'false',
      'false',
      'false',
      'false',
    ])
  })
})

describe('AC13: selecting a chip', () => {
  it('AC13: clicking an inactive chip calls onSelect with its id', async () => {
    const { onSelect, user } = setup('zt1')
    await user.click(screen.getByRole('button', { name: 'ZQC' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith('zt3')
  })
  it('AC13: clicking the active chip does not call onSelect', async () => {
    const { onSelect, user } = setup('zt1')
    await user.click(screen.getByRole('button', { name: 'ZQA' }))
    expect(onSelect).not.toHaveBeenCalled()
  })
  it('AC19: with an unknown active id any chip can be selected', async () => {
    const { onSelect, user } = setup('nope')
    await user.click(screen.getByRole('button', { name: 'ZQB' }))
    expect(onSelect).toHaveBeenCalledWith('zt2')
  })
  it('AC13: Enter on a focused chip selects it', async () => {
    const { onSelect, user } = setup('zt1')
    screen.getByRole('button', { name: 'ZQD' }).focus()
    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith('zt4')
  })
})
