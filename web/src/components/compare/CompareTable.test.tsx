import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Entity, EntityKind, StatDef } from '../../domain/types'
import { compareStatDefs, comparePlayers, compareTeams } from '../../test/compareFixtures'
import { CompareTable } from './CompareTable'
import { gridColumns, type CompareColumn } from './tableModel'

const defs = compareStatDefs()
const def = (key: string, kind: EntityKind = 'players'): StatDef => {
  const found = defs[kind].find((d) => d.key === key)
  if (!found) throw new Error(`no def ${key}`)
  return found
}
const columnsOf = (entities: Entity[], ids: string[]): CompareColumn[] =>
  ids.map((id, colorIndex) => {
    const entity = entities.find((e) => e.id === id)
    if (!entity) throw new Error(`no entity ${id}`)
    return { entity, colorIndex }
  })

function renderPlayers(
  ids: string[],
  keys: string[] = ['zhigh', 'zlow', 'zbig', 'zsign', 'zsolo'],
) {
  return render(
    <CompareTable
      kind="players"
      columns={columnsOf(comparePlayers(), ids)}
      rows={keys.map((k) => def(k))}
    />,
  )
}

const rowOf = (label: RegExp) => {
  const row = screen.getByRole('rowheader', { name: label }).closest('[role="row"]')
  if (!(row instanceof HTMLElement)) throw new Error('row not found')
  return row
}
const cellNames = (label: RegExp) =>
  within(rowOf(label))
    .getAllByRole('cell')
    .map((c) => c.textContent)

describe('AC15: best pills', () => {
  it('AC15: the highest value is pilled and exposes "best"', () => {
    renderPlayers(['zp1', 'zp2', 'zp3'])
    expect(screen.getByRole('cell', { name: /^4,000\s?\(best\)$/ })).toBeInTheDocument()
    expect(screen.queryByRole('cell', { name: /^1,200\s?\(best\)$/ })).not.toBeInTheDocument()
  })
  it('AC15: the pilled value sits inside the Pill primitive, plain values do not', () => {
    renderPlayers(['zp1', 'zp2', 'zp3'])
    const row = rowOf(/^Zbig/)
    expect(within(row).getByText('4,000').className).toMatch(/pill/)
    expect(within(row).getByText('1,200').className).not.toMatch(/pill/)
  })
  it('AC15: ties pill every tied cell', () => {
    renderPlayers(['zp1', 'zp2', 'zp3'])
    expect(within(rowOf(/^Zhigh/)).queryAllByText(/\(best\)/)).toHaveLength(2)
    expect(within(rowOf(/^Zhigh/)).getAllByRole('cell')[2]).toHaveAccessibleName('5')
  })
  it('AC15: lower-is-better rows pill the smallest value', () => {
    renderPlayers(['zp1', 'zp2', 'zp3'])
    const cells = within(rowOf(/^Zlow/)).getAllByRole('cell')
    expect(cells.map((c) => c.textContent)).toEqual(['3.50', '1.25 (best)', '2.00'])
  })
  it('AC15: N/A values are ignored when picking the best', () => {
    renderPlayers(['zp3', 'zp4', 'zp5'], ['zhigh'])
    expect(cellNames(/^Zhigh/)).toEqual(['5', '—not applicable', '7 (best)'])
  })
  it('AC15: a null is never pilled even when the others tie', () => {
    renderPlayers(['zp1', 'zp2', 'zp4'], ['zhigh'])
    expect(within(rowOf(/^Zhigh/)).queryAllByText(/\(best\)/)).toHaveLength(2)
    expect(within(rowOf(/^Zhigh/)).getAllByRole('cell')[2]).toHaveAccessibleName('not applicable')
  })
  it('AC15: a single selected entity has no pill in any row', () => {
    renderPlayers(['zp1'])
    expect(screen.queryAllByText(/\(best\)/)).toHaveLength(0)
  })
  it('AC15: a row with one non-null value has no pill', () => {
    renderPlayers(['zp1', 'zp2', 'zp3'], ['zsolo'])
    expect(within(rowOf(/^Zsolo/)).queryAllByText(/\(best\)/)).toHaveLength(0)
    expect(within(rowOf(/^Zsolo/)).getAllByRole('cell')[0]).toHaveAccessibleName('7')
  })
  it('AC15: the teams table pills the smallest lower-is-better value', () => {
    render(
      <CompareTable
        kind="teams"
        columns={columnsOf(compareTeams(), ['zt1', 'zt2', 'zt3'])}
        rows={[def('ztpts', 'teams'), def('ztlow', 'teams')]}
      />,
    )
    expect(
      within(rowOf(/^Ztlow/))
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['20.5', '18.2 (best)', '22.0'])
  })
})

describe('AC14: not applicable', () => {
  it('AC14: null shows the glyph and exposes "not applicable"', () => {
    renderPlayers(['zp1', 'zp2', 'zp3'], ['zsolo'])
    const [, second] = within(rowOf(/^Zsolo/)).getAllByRole('cell')
    expect(second).toHaveAccessibleName('not applicable')
    expect(within(second).getByText('—')).toBeInTheDocument()
  })
  it('AC14: a missing key is also not applicable', () => {
    renderPlayers(['zp1', 'zp2', 'zp3'], ['zsolo'])
    expect(screen.getAllByRole('cell', { name: 'not applicable' })).toHaveLength(2)
  })
  it('AC14: the glyph is hidden from assistive technology and is not a pill', () => {
    renderPlayers(['zp1', 'zp2', 'zp3'], ['zsolo'])
    const glyph = screen.getAllByText('—')[0]
    expect(glyph).toHaveAttribute('aria-hidden', 'true')
    expect(glyph.className).not.toMatch(/pill/)
  })
})

describe('AC13: value formatting', () => {
  it('AC13: decimals, thousands separators and the plus sign follow the stat definition', () => {
    renderPlayers(['zp1', 'zp2', 'zp3'])
    expect(cellNames(/^Zsign/)).toEqual(['+2.0 (best)', '-1.0', '0.0'])
    expect(cellNames(/^Zbig/)[0]).toBe('4,000 (best)')
    expect(cellNames(/^Zlow/)[0]).toBe('3.50')
  })
})

describe('AC16: lower is better note', () => {
  it('AC16: only lower-is-better rows carry the note', () => {
    renderPlayers(['zp1', 'zp2', 'zp3'])
    const noted = screen
      .getAllByRole('rowheader')
      .filter((h) => within(h).queryByText('lower is better'))
      .map((h) => h.textContent)
    expect(noted).toEqual(['Zlowlower is better'])
  })
  it('AC16: the teams table shows the note on its lower-is-better row', () => {
    render(
      <CompareTable
        kind="teams"
        columns={columnsOf(compareTeams(), ['zt1', 'zt2', 'zt3'])}
        rows={[def('ztpts', 'teams'), def('ztlow', 'teams')]}
      />,
    )
    expect(within(rowOf(/^Ztlow/)).getByText('lower is better')).toBeInTheDocument()
    expect(within(rowOf(/^Ztpts/)).queryByText('lower is better')).not.toBeInTheDocument()
  })
})

describe('AC17: header lines', () => {
  it('AC17: four entities show name and meta', () => {
    renderPlayers(['zp1', 'zp2', 'zp3', 'zp4'])
    const header = screen.getByRole('columnheader', { name: /Ola Quenby/ })
    expect(within(header).getByText('Ola Quenby')).toBeInTheDocument()
    expect(within(header).getByText('zmeta zp1')).toBeInTheDocument()
    expect(screen.queryByText('Quenby')).not.toBeInTheDocument()
  })
  it('AC17: five entities switch every header to shortName and badge', () => {
    renderPlayers(['zp1', 'zp2', 'zp3', 'zp4', 'zp5'])
    const header = screen.getByRole('columnheader', { name: /Quenby/ })
    expect(within(header).getByText('Quenby')).toBeInTheDocument()
    expect(within(header).getByText('ZB1')).toBeInTheDocument()
    expect(screen.queryByText('Ola Quenby')).not.toBeInTheDocument()
    expect(screen.queryByText('zmeta zp1')).not.toBeInTheDocument()
    expect(screen.getByText('Whitlock')).toBeInTheDocument()
  })
  it('AC17: removing back to four restores full headers', () => {
    const view = renderPlayers(['zp1', 'zp2', 'zp3', 'zp4', 'zp5'])
    view.rerender(
      <CompareTable
        kind="players"
        columns={columnsOf(comparePlayers(), ['zp1', 'zp2', 'zp3', 'zp4'])}
        rows={[def('zhigh')]}
      />,
    )
    expect(screen.getByText('Ola Quenby')).toBeInTheDocument()
  })
  it('AC17: names are rendered as text, never as markup', () => {
    const [first] = comparePlayers()
    const evil: Entity = { ...first, name: '<b>Bold</b> Name' }
    render(<CompareTable kind="players" columns={[{ entity: evil, colorIndex: 0 }]} rows={[]} />)
    expect(screen.getByText('<b>Bold</b> Name')).toBeInTheDocument()
  })
})

describe('AC9: header dots', () => {
  it('AC9: each header dot uses the series colour of its colour index', () => {
    const players = comparePlayers()
    const columns: CompareColumn[] = [
      { entity: players[0], colorIndex: 0 },
      { entity: players[1], colorIndex: 2 },
    ]
    render(<CompareTable kind="players" columns={columns} rows={[def('zhigh')]} />)
    const dots = screen
      .getAllByRole('columnheader')
      .slice(1)
      .map((h) => h.querySelector('[aria-hidden="true"]')?.getAttribute('style'))
    expect(dots[0]).toContain('var(--series-1)')
    expect(dots[1]).toContain('var(--series-3)')
  })
})

describe('AC19: table semantics', () => {
  it('AC19: the players table is named', () => {
    renderPlayers(['zp1', 'zp2', 'zp3'])
    expect(
      screen.getByRole('table', { name: 'Selected players compared by stat' }),
    ).toBeInTheDocument()
  })
  it('AC19: the teams table is named', () => {
    render(
      <CompareTable
        kind="teams"
        columns={columnsOf(compareTeams(), ['zt1', 'zt2', 'zt3'])}
        rows={[def('ztpts', 'teams')]}
      />,
    )
    expect(
      screen.getByRole('table', { name: 'Selected teams compared by stat' }),
    ).toBeInTheDocument()
  })
  it('AC19: Stat plus one column header per entity, with scope col', () => {
    renderPlayers(['zp1', 'zp2', 'zp3'])
    const headers = screen.getAllByRole('columnheader')
    expect(headers).toHaveLength(4)
    expect(headers[0]).toHaveTextContent('Stat')
    expect(headers.map((h) => h.getAttribute('scope'))).toEqual(['col', 'col', 'col', 'col'])
    expect(headers[1]).toHaveTextContent('Ola Quenby')
  })
  it('AC19: one row header per stat, with scope row, in the given order', () => {
    renderPlayers(['zp1', 'zp2', 'zp3'], ['zhigh', 'zlow', 'zbig'])
    const heads = screen.getAllByRole('rowheader')
    expect(heads.map((h) => h.getAttribute('scope'))).toEqual(['row', 'row', 'row'])
    expect(heads.map((h) => h.textContent)).toEqual(['Zhigh', 'Zlowlower is better', 'Zbig'])
  })
  it('AC19: each body row has one cell per entity', () => {
    renderPlayers(['zp1', 'zp2', 'zp3'])
    expect(screen.getAllByRole('cell')).toHaveLength(15)
    expect(screen.getAllByRole('row')).toHaveLength(6)
  })
  it('AC19: the table has row groups', () => {
    renderPlayers(['zp1', 'zp2'])
    expect(screen.getAllByRole('rowgroup')).toHaveLength(2)
  })
})

describe('AC18: caption', () => {
  it('AC18: the caption is visible text below the table', () => {
    renderPlayers(['zp1', 'zp2', 'zp3'])
    const caption = screen.getByText('Black = best among selected · — = not applicable to position')
    expect(caption).toBeVisible()
    const table = screen.getByRole('table')
    expect(table.compareDocumentPosition(caption) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('AC18: the caption is the same for teams', () => {
    render(
      <CompareTable
        kind="teams"
        columns={columnsOf(compareTeams(), ['zt1', 'zt2'])}
        rows={[def('ztpts', 'teams')]}
      />,
    )
    expect(
      screen.getByText('Black = best among selected · — = not applicable to position'),
    ).toBeInTheDocument()
  })
})

describe('AC20: scroll region', () => {
  it('AC20: the table sits in a named region with tabindex 0 that can take focus', () => {
    renderPlayers(['zp1', 'zp2', 'zp3'])
    const region = screen.getByRole('region', { name: 'Comparison table' })
    expect(region).toHaveAttribute('tabindex', '0')
    expect(within(region).getByRole('table')).toBeInTheDocument()
    region.focus()
    expect(region).toHaveFocus()
  })
  it('AC20: the caption is outside the scroll region', () => {
    renderPlayers(['zp1', 'zp2', 'zp3'])
    const region = screen.getByRole('region', { name: 'Comparison table' })
    expect(within(region).queryByText(/Black = best/)).not.toBeInTheDocument()
  })
})

describe('AC21: grid template and min-width', () => {
  it('AC21: three entities give a 580px min-width and the three-column template', () => {
    renderPlayers(['zp1', 'zp2', 'zp3'])
    expect(screen.getByRole('table')).toHaveStyle({ minWidth: '580px' })
    expect(rowOf(/^Zhigh/).getAttribute('style')).toContain(gridColumns(3))
  })
  it('AC21: eight entities give a 1230px min-width and the eight-column template', () => {
    renderPlayers(['zp1', 'zp2', 'zp3', 'zp4', 'zp5', 'zp6', 'zp7', 'zp8'])
    expect(screen.getByRole('table')).toHaveStyle({ minWidth: '1230px' })
    expect(screen.getAllByRole('columnheader')).toHaveLength(9)
    expect(screen.getAllByRole('cell', { name: /^\d/ }).length).toBeGreaterThan(0)
    expect(rowOf(/^Zhigh/).getAttribute('style')).toContain(gridColumns(8))
    expect(screen.getAllByRole('row')[0].getAttribute('style')).toContain(gridColumns(8))
  })
  it('AC21: eight entities use compact headers', () => {
    renderPlayers(['zp1', 'zp2', 'zp3', 'zp4', 'zp5', 'zp6', 'zp7', 'zp8'])
    expect(screen.getByText('Zandor')).toBeInTheDocument()
    expect(screen.getByText('ZB8')).toBeInTheDocument()
    expect(screen.queryByText('Vik Zandor')).not.toBeInTheDocument()
  })
})
