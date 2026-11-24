import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { comparePlayers, compareStatDefs } from '../../test/compareFixtures'
import { DotPlot } from './DotPlot'
import { resolveColumns, resolveRows } from './tableModel'

const pool = comparePlayers()
const rows = resolveRows(['zhigh', 'zlow'], compareStatDefs().players)

function setup(sel = ['zp1', 'zp2', 'zp4']) {
  return render(<DotPlot columns={resolveColumns(sel, pool)} rows={rows} pool={pool} />)
}
const row = (name: RegExp) =>
  within(screen.getByRole('group', { name: 'Dot plot' })).getByRole('group', { name })

describe('DotPlot', () => {
  it('draws one labelled scale per stat', () => {
    setup()
    const groups = within(screen.getByRole('group', { name: 'Dot plot' })).getAllByRole('group')
    expect(groups).toHaveLength(2)
    expect(row(/^Zhigh$/)).toBeInTheDocument()
    expect(row(/^Zlow lower is better$/)).toBeInTheDocument()
  })

  it('lists every selected value as text, including not applicable ones', () => {
    setup()
    const items = within(row(/^Zhigh$/)).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Quenby: 10 (best)')
    expect(items[2]).toHaveTextContent('Tolliver')
    expect(items[2]).toHaveTextContent('not applicable')
  })

  it('plots one dot for each selected value that exists, in the series colour', () => {
    setup()
    const dots = within(row(/^Zhigh$/)).getAllByTestId('dot')
    expect(dots).toHaveLength(2)
    expect(dots[0].style.background).toBe('var(--series-1)')
    expect(dots[1].style.background).toBe('var(--series-2)')
    expect(dots[0]).toHaveAttribute('title', 'Ola Quenby: 10')
  })

  it('shows the rest of the league and the ends of the scale', () => {
    setup(['zp1'])
    const high = within(row(/^Zhigh$/))
    expect(high.getAllByTestId('league-dot').length).toBeGreaterThan(0)
    expect(high.getByTestId('scale-max')).toHaveTextContent('10')
  })
})
