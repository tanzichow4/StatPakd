import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { compareStatDefs, comparePlayers, compareTeams } from '../../test/compareFixtures'
import { axisDefs, readoutModel, type ReadoutCard } from './chart3dModel'
import { Readout } from './Readout'
import { resolveColumns } from './tableModel'

const defs = compareStatDefs()
const players = comparePlayers()

function cardsFor(ids: string[], axes: [string, string, string] = ['zhigh', 'zlow', 'zbig']) {
  return readoutModel(resolveColumns(ids, players), axes, axisDefs(axes, defs.players))
}
function renderPlayers(ids = ['zp1', 'zp2', 'zp3'], axes?: [string, string, string]) {
  return render(<Readout kind="players" cards={cardsFor(ids, axes)} />)
}

const items = () => screen.getAllByRole('listitem')
const text = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()

describe('AC30: heading and cards', () => {
  it('AC30: the aside has the heading Readout', () => {
    renderPlayers()
    expect(screen.getByRole('complementary')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Readout' })).toBeInTheDocument()
  })
  it('AC30: the heading comes before the list', () => {
    renderPlayers()
    const heading = screen.getByRole('heading', { name: 'Readout' })
    const list = screen.getByRole('list')
    expect(heading.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('AC30: one card per entity in the given selection order', () => {
    renderPlayers(['zp3', 'zp1', 'zp2'])
    const names = items().map((li) => text(li))
    expect(items()).toHaveLength(3)
    expect(names[0]).toContain('Quill Dorvane')
    expect(names[1]).toContain('Ola Quenby')
    expect(names[2]).toContain('Pim Rastow')
  })
  it('AC30: a single card renders a single list item', () => {
    renderPlayers(['zp2'])
    expect(items()).toHaveLength(1)
  })
  it('AC30: eight cards render eight list items', () => {
    renderPlayers(['zp1', 'zp2', 'zp3', 'zp4', 'zp5', 'zp6', 'zp7', 'zp8'])
    expect(items()).toHaveLength(8)
  })
})

describe('AC31: card content', () => {
  it('AC31: the card shows the full name, not the short name', () => {
    renderPlayers(['zp1'])
    expect(screen.getByText('Ola Quenby')).toBeInTheDocument()
    expect(screen.queryByText('Quenby')).not.toBeInTheDocument()
  })
  it('AC31: the cells show letter, formatted value and stat label for X, Y, Z in order', () => {
    renderPlayers(['zp1'])
    const li = items()[0]
    const t = text(li)
    expect(t.replace(/\s/g, '')).toBe('OlaQuenbyX10ZhighY3.50ZlowZ4,000Zbig')
    expect(within(li).getByText('10')).toBeInTheDocument()
    expect(within(li).getByText('3.50')).toBeInTheDocument()
    expect(within(li).getByText('4,000')).toBeInTheDocument()
    expect(within(li).getByText('Zhigh')).toBeInTheDocument()
    expect(within(li).getByText('Zlow')).toBeInTheDocument()
    expect(within(li).getByText('Zbig')).toBeInTheDocument()
    for (const letter of ['X', 'Y', 'Z']) {
      expect(within(li).getByText(letter)).toBeInTheDocument()
    }
  })
  it('AC31: values follow the stat decimals and sign format', () => {
    renderPlayers(['zp1', 'zp2'], ['zsign', 'zlow', 'zbig'])
    expect(within(items()[0]).getByText('+2.0')).toBeInTheDocument()
    expect(within(items()[1]).getByText('-1.0')).toBeInTheDocument()
    expect(within(items()[1]).getByText('1.25')).toBeInTheDocument()
  })
  it('AC31: zero with a signed stat shows no plus sign', () => {
    renderPlayers(['zp3'], ['zsign', 'zlow', 'zbig'])
    expect(within(items()[0]).getByText('0.0')).toBeInTheDocument()
  })
  it('AC31: the colour square uses the series variable for its selection index', () => {
    const { container } = renderPlayers()
    const html = container.innerHTML
    expect(html).toContain('var(--series-1)')
    expect(html).toContain('var(--series-2)')
    expect(html).toContain('var(--series-3)')
    const lis = items()
    expect(lis[0].innerHTML).toContain('var(--series-1)')
    expect(lis[1].innerHTML).toContain('var(--series-2)')
    expect(lis[2].innerHTML).toContain('var(--series-3)')
    expect(lis[0].innerHTML).not.toContain('var(--series-2)')
  })
  it('AC31: the same stat on two axes gives two cells with the same value', () => {
    renderPlayers(['zp1'], ['zhigh', 'zhigh', 'zbig'])
    expect(within(items()[0]).getAllByText('10')).toHaveLength(2)
    expect(within(items()[0]).getAllByText('Zhigh')).toHaveLength(2)
  })
})

describe('AC32: not applicable values', () => {
  it('AC32: a null value shows an em dash and keeps its card', () => {
    renderPlayers(['zp4'])
    const li = items()[0]
    expect(within(li).getByText('Rex Tolliver')).toBeInTheDocument()
    expect(within(li).getByText('—')).toBeInTheDocument()
    expect(within(li).getByText('9.00')).toBeInTheDocument()
    expect(within(li).getByText('2,500')).toBeInTheDocument()
  })
  it('AC32: a missing stat key shows an em dash', () => {
    // zp3 has no zsolo entry at all.
    renderPlayers(['zp3'], ['zhigh', 'zlow', 'zsolo'])
    expect(within(items()[0]).getByText('—')).toBeInTheDocument()
    expect(within(items()[0]).getByText('Zsolo')).toBeInTheDocument()
  })
  it('AC32: several null cells each show an em dash', () => {
    renderPlayers(['zp4'], ['zhigh', 'zsolo', 'zsolo'])
    expect(within(items()[0]).getAllByText('—')).toHaveLength(3)
  })
  it('AC32: an axis without a definition shows an em dash and no stat label', () => {
    const axes: [string, string, string] = ['zhigh', 'znope', 'zbig']
    const cards = readoutModel(resolveColumns(['zp1'], players), axes, axisDefs(axes, defs.players))
    render(<Readout kind="players" cards={cards} />)
    const li = items()[0]
    expect(within(li).getByText('—')).toBeInTheDocument()
    expect(within(li).getByText('Zhigh')).toBeInTheDocument()
    expect(within(li).getByText('Zbig')).toBeInTheDocument()
  })
  it('AC32: a value of zero is a number, not an em dash', () => {
    const zero = { ...players[0], stats: { zhigh: 0, zlow: 0, zbig: 0 } }
    const axes: [string, string, string] = ['zhigh', 'zlow', 'zbig']
    const cards = readoutModel(resolveColumns(['zp1'], [zero]), axes, axisDefs(axes, defs.players))
    render(<Readout kind="players" cards={cards} />)
    expect(within(items()[0]).queryByText('—')).not.toBeInTheDocument()
    expect(within(items()[0]).getAllByText('0').length).toBeGreaterThan(0)
  })
})

describe('AC33: the readout is a text alternative', () => {
  it('AC33: the list is exposed as a list with one listitem per entity', () => {
    renderPlayers()
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(3)
  })
  it('AC33: the card text reads the name followed by letter, value and label cells', () => {
    renderPlayers(['zp1'])
    const t = text(items()[0])
    expect(t.startsWith('Ola Quenby')).toBe(true)
    expect(t).toMatch(/X.*10.*Zhigh/)
    expect(t).toMatch(/Y.*3\.50.*Zlow/)
    expect(t).toMatch(/Z.*4,000.*Zbig/)
  })
  it('AC33: nothing in the readout is hidden from assistive technology', () => {
    const { container } = renderPlayers(['zp1'])
    const hidden = Array.from(container.querySelectorAll('[aria-hidden="true"]'))
    for (const h of hidden) {
      expect(h.textContent ?? '').toBe('')
    }
  })
})

describe('AC3: the empty readout', () => {
  it('AC3: no cards shows the heading and the player empty text and no list', () => {
    render(<Readout kind="players" cards={[]} />)
    expect(screen.getByRole('heading', { name: 'Readout' })).toBeInTheDocument()
    expect(screen.getByText('Add a player to start comparing.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })
  it('AC3: teams show the team empty text', () => {
    render(<Readout kind="teams" cards={[]} />)
    expect(screen.getByText('Add a team to start comparing.')).toBeInTheDocument()
    expect(screen.queryByText('Add a player to start comparing.')).not.toBeInTheDocument()
  })
  it('AC3: the empty text comes after the heading', () => {
    render(<Readout kind="players" cards={[]} />)
    const heading = screen.getByRole('heading', { name: 'Readout' })
    const message = screen.getByText('Add a player to start comparing.')
    expect(heading.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('AC3: cards hide the empty text', () => {
    renderPlayers()
    expect(screen.queryByText(/to start comparing/)).not.toBeInTheDocument()
  })
})

describe('Readout with teams', () => {
  it('AC30: team cards use the full team name', () => {
    const axes: [string, string, string] = ['ztpts', 'ztlow', 'ztwin']
    const teams = compareTeams()
    const cards: ReadoutCard[] = readoutModel(
      resolveColumns(['zt2'], teams),
      axes,
      axisDefs(axes, defs.teams),
    )
    render(<Readout kind="teams" cards={cards} />)
    expect(within(items()[0]).getByText('Quark Boulders')).toBeInTheDocument()
    expect(within(items()[0]).getByText('25.0')).toBeInTheDocument()
    expect(within(items()[0]).getByText('Ztwin')).toBeInTheDocument()
  })
})
