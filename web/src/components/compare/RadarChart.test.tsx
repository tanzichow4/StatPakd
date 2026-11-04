import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { compareStatDefs, comparePlayers, compareTeams } from '../../test/compareFixtures'
import { RadarChart } from './RadarChart'
import { radarModel } from './radarModel'
import { resolveColumns, resolveRows } from './tableModel'

const defs = compareStatDefs()
const players = comparePlayers()
const teams = compareTeams()
const MESSAGE = 'Pick at least 3 stats for the radar.'
const CAPTION =
  'Axes scaled to league range; "lower is better" stats are inverted so outward is always better.'

function renderPlayers(ids = ['zp1', 'zp2', 'zp3'], keys = ['zhigh', 'zlow', 'zbig']) {
  const columns = resolveColumns(ids, players)
  const rows = resolveRows(keys, defs.players)
  return { columns, rows, ...render(<RadarChart columns={columns} rows={rows} pool={players} />) }
}
function renderTeams(keys: string[]) {
  return render(
    <RadarChart
      columns={resolveColumns(['zt1', 'zt2', 'zt3'], teams)}
      rows={resolveRows(keys, defs.teams)}
      pool={teams}
    />,
  )
}

const series = () => screen.getAllByTestId('radar-series')
const polyOf = (g: Element) => g.querySelector('polygon') as SVGPolygonElement
const pointsOf = (g: Element) => polyOf(g).getAttribute('points')
const dotsOf = (g: Element) => Array.from(g.querySelectorAll('circle'))
const legendItems = () =>
  within(screen.getByRole('list', { name: 'Legend' })).getAllByRole('listitem')
const colourOf = (g: Element) => (g as HTMLElement).style.getPropertyValue('--series')
const alt = (name: string) => {
  const group = screen.getByRole('group', { name: 'Radar chart' })
  return within(group).getByText(name) as HTMLElement
}

describe('RadarChart structure (AC1, AC17, AC19)', () => {
  it('AC1: the chart is a group named Radar chart holding one svg', () => {
    renderPlayers()
    const group = screen.getByRole('group', { name: 'Radar chart' })
    expect(group.querySelectorAll('svg')).toHaveLength(1)
    expect(screen.queryByText(MESSAGE)).toBeNull()
    expect(screen.queryByText(/coming soon/)).toBeNull()
  })
  it('AC1: 3 stats give 4 rings, 3 spokes, 3 series and 3 dots per series', () => {
    renderPlayers()
    expect(screen.getAllByTestId('radar-ring')).toHaveLength(4)
    expect(screen.getAllByTestId('radar-spoke')).toHaveLength(3)
    expect(series()).toHaveLength(3)
    series().forEach((g) => expect(dotsOf(g)).toHaveLength(3))
  })
  it('AC1: the svg uses the 520 by 420 viewBox', () => {
    const { container } = renderPlayers()
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 520 420')
  })
  it('AC17: 8 entities give 8 polygons and 8 legend entries', () => {
    renderPlayers(players.map((p) => p.id))
    expect(series()).toHaveLength(8)
    expect(legendItems()).toHaveLength(8)
  })
  it('AC17: four stats give four spokes and rings through four axes', () => {
    renderPlayers(['zp1', 'zp2'], ['zhigh', 'zlow', 'zbig', 'zsign'])
    expect(screen.getAllByTestId('radar-spoke')).toHaveLength(4)
    expect(screen.getAllByTestId('radar-label')).toHaveLength(4)
    expect(screen.getAllByTestId('radar-ring')[3].getAttribute('points')?.split(' ')).toHaveLength(
      4,
    )
  })
})

describe('RadarChart series and geometry (AC8, AC10, AC22)', () => {
  it('AC10: polygons take the series colour of their selection index', () => {
    renderPlayers()
    expect(series().map(colourOf)).toEqual([
      'var(--series-1)',
      'var(--series-2)',
      'var(--series-3)',
    ])
  })
  it('AC10: an unknown id leaves a gap and later entities keep their colour index', () => {
    renderPlayers(['zp1', 'zmissing', 'zp2'])
    expect(series().map(colourOf)).toEqual(['var(--series-1)', 'var(--series-3)'])
  })
  it('AC10: series are drawn in selection order, so the later one is on top', () => {
    renderPlayers(['zp3', 'zp1', 'zp2'])
    expect(series().map(colourOf)).toEqual([
      'var(--series-1)',
      'var(--series-2)',
      'var(--series-3)',
    ])
    expect(legendItems().map((li) => li.textContent)).toEqual([
      expect.stringContaining('Quill Dorvane'),
      expect.stringContaining('Ola Quenby'),
      expect.stringContaining('Pim Rastow'),
    ])
  })
  it('AC22: the zp1 polygon matches the pure model and starts at the top axis', () => {
    const { columns, rows } = renderPlayers()
    const model = radarModel(rows, columns, players)
    expect(pointsOf(series()[0])).toBe(model.series[0].pointsAttr)
    expect(pointsOf(series()[0])).toContain('260,60')
  })
  it('AC8: the zp2 zlow vertex is the pool minimum of a lower-is-better stat, at full radius', () => {
    renderPlayers()
    expect(pointsOf(series()[1])).toContain('389.9,285')
  })
  it('AC8: zp3 (smallest selected zhigh, not pool minimum) sits strictly inside the 0.08 floor', () => {
    renderPlayers()
    expect(pointsOf(series()[2])?.split(' ')[0]).toBe('260,136.7')
  })
  it('AC10: each dot centre equals its polygon vertex', () => {
    renderPlayers()
    const g = series()[0]
    const fromDots = dotsOf(g).map((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`)
    expect(fromDots.join(' ')).toBe(pointsOf(g))
  })
  it('AC9: labels render the stat labels in canonical order with anchors and alignment', () => {
    renderPlayers(['zp1', 'zp2', 'zp3'], ['zbig', 'zlow', 'zhigh'])
    const labels = screen.getAllByTestId('radar-label')
    expect(labels.map((l) => l.textContent)).toEqual(['Zhigh', 'Zlow', 'Zbig'])
    expect(labels.map((l) => [l.style.left, l.style.top])).toEqual([
      ['50%', '10%'],
      ['78%', '70%'],
      ['22%', '70%'],
    ])
    expect(labels[0].className).toMatch(/middle/)
    expect(labels[1].className).toMatch(/start/)
    expect(labels[2].className).toMatch(/end/)
  })
  it('AC9: a stat without a definition adds no axis', () => {
    renderPlayers(['zp1', 'zp2'], ['zhigh', 'zlow', 'zbig', 'znope'])
    expect(screen.getAllByTestId('radar-label')).toHaveLength(3)
  })
})

describe('RadarChart not applicable values (AC12, AC13, AC14)', () => {
  const keys = ['zhigh', 'zlow', 'zsolo']
  it('AC12: a null value plots its vertex and dot at the centre', () => {
    renderPlayers(['zp1', 'zp2'], keys)
    const zp2 = series()[1]
    expect(pointsOf(zp2)?.split(' ')[2]).toBe('260,210')
    const dot = dotsOf(zp2)[2]
    expect([dot.getAttribute('cx'), dot.getAttribute('cy')]).toEqual(['260', '210'])
  })
  it('AC12: a missing key (not null) also plots at the centre', () => {
    renderPlayers(['zp1', 'zp3'], keys)
    expect(pointsOf(series()[1])?.split(' ')[2]).toBe('260,210')
  })
  it('AC13: the legend lists the stats an entity has no value for', () => {
    renderPlayers(['zp1', 'zp2'], keys)
    const [first, second] = legendItems()
    expect(within(second).getByText('Not applicable: Zsolo')).toBeInTheDocument()
    expect(first.textContent).not.toMatch(/Not applicable/)
  })
  it('AC13: several missing labels are joined in axis order', () => {
    renderPlayers(['zp4'], ['zsolo', 'zhigh', 'zlow'])
    expect(screen.getByText('Not applicable: Zhigh, Zsolo')).toBeInTheDocument()
  })
  it('AC13: no Not applicable line when nothing is missing', () => {
    renderPlayers()
    expect(screen.queryByText(/Not applicable/)).toBeNull()
  })
  it('AC13: a null in one entity does not change another entity range', () => {
    renderPlayers(['zp1', 'zp2'], keys)
    // zsolo has a single non-null value in the pool, so the range is flat: t = 0.54
    expect(pointsOf(series()[0])?.split(' ')[2]).toBe('189.9,250.5')
  })
  it('AC14: an all-null entity is a degenerate polygon at the centre with no NaN', () => {
    const empty = { ...players[0], id: 'znull', name: 'Null Nobody', stats: {} }
    const columns = resolveColumns(['znull'], [empty])
    const rows = resolveRows(['zhigh', 'zlow', 'zbig'], defs.players)
    const { container } = render(<RadarChart columns={columns} rows={rows} pool={players} />)
    expect(pointsOf(series()[0])).toBe('260,210 260,210 260,210')
    expect(container.innerHTML).not.toMatch(/NaN/)
    expect(screen.getByText('Not applicable: Zhigh, Zlow, Zbig')).toBeInTheDocument()
  })
  it('AC14: an empty pool gives no NaN and the flat-range position for real values', () => {
    const columns = resolveColumns(['zp1'], players)
    const rows = resolveRows(['zhigh', 'zlow', 'zbig'], defs.players)
    const { container } = render(<RadarChart columns={columns} rows={rows} pool={[]} />)
    expect(container.innerHTML).not.toMatch(/NaN/)
    expect(pointsOf(series()[0])?.split(' ')[0]).toBe('260,129')
  })
})

describe('RadarChart fewer than 3 stats (AC4, AC5)', () => {
  it.each([
    ['0', []],
    ['1', ['zhigh']],
    ['2', ['zhigh', 'zlow']],
  ])('AC4: %s stats show the message and no chart parts', (_n, keys) => {
    const { container } = renderPlayers(['zp1', 'zp2', 'zp3'], keys)
    expect(screen.getByText(MESSAGE)).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('polygon')).toBeNull()
    expect(screen.queryAllByTestId('radar-label')).toHaveLength(0)
    expect(screen.queryByRole('group', { name: 'Radar chart' })).toBeNull()
  })
  it('AC5: the legend and caption still show in the message state', () => {
    renderPlayers(['zp1', 'zp2', 'zp3'], ['zhigh', 'zlow'])
    expect(legendItems()).toHaveLength(3)
    expect(screen.getByText('Ola Quenby')).toBeInTheDocument()
    expect(screen.getByText(CAPTION)).toBeInTheDocument()
  })
  it('AC5: with no stats the legend and caption still show', () => {
    renderPlayers(['zp1'], [])
    expect(legendItems()).toHaveLength(1)
    expect(screen.getByText(CAPTION)).toBeInTheDocument()
  })
  it('AC4: exactly 3 stats is the boundary where the chart appears', () => {
    renderPlayers(['zp1'], ['zhigh', 'zlow', 'zbig'])
    expect(screen.queryByText(MESSAGE)).toBeNull()
    expect(series()).toHaveLength(1)
  })
})

describe('RadarChart legend (AC19, AC22)', () => {
  it('AC19: each legend entry shows the full name and the meta', () => {
    renderPlayers()
    const items = legendItems()
    expect(within(items[0]).getByText('Ola Quenby')).toBeInTheDocument()
    expect(within(items[0]).getByText('zmeta zp1')).toBeInTheDocument()
    expect(within(items[2]).getByText('Quill Dorvane')).toBeInTheDocument()
    expect(within(items[2]).getByText('zmeta zp3')).toBeInTheDocument()
  })
  it('AC19: each legend entry carries its series colour', () => {
    renderPlayers()
    expect(legendItems().map(colourOf)).toEqual([
      'var(--series-1)',
      'var(--series-2)',
      'var(--series-3)',
    ])
  })
  it('AC22: the caption text is exact and appears once', () => {
    renderPlayers()
    expect(screen.getAllByText(CAPTION)).toHaveLength(1)
  })
})

describe('RadarChart accessibility (AC18, AC20)', () => {
  it('AC18: the svg and the label overlay are hidden from assistive technology', () => {
    const { container } = renderPlayers()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getAllByTestId('radar-label')[0].parentElement).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  })
  it('AC18: the text alternative gives name, labels and formatted values per entity', () => {
    renderPlayers()
    const one = alt('Ola Quenby').textContent ?? ''
    expect(one).toContain('Zhigh: 10')
    expect(one).toContain('Zlow: 3.50')
    expect(one).toContain('Zbig: 4,000')
    expect(alt('Pim Rastow').textContent).toContain('Zlow: 1.25')
  })
  it('AC18: a missing value reads as not applicable', () => {
    renderPlayers(['zp1', 'zp2'], ['zhigh', 'zlow', 'zsolo'])
    expect(alt('Pim Rastow').textContent).toContain('Zsolo: not applicable')
    expect(alt('Ola Quenby').textContent).toContain('Zsolo: 7')
  })
  it('AC18: the text alternative never says Radar chart or coming soon', () => {
    renderPlayers()
    const group = screen.getByRole('group', { name: 'Radar chart' })
    expect(within(group).queryByText(/Radar chart|coming soon/)).toBeNull()
  })
  it('AC20: no interactive elements or tab stops anywhere in the radar', () => {
    renderPlayers()
    const root = screen.getByTestId('radar')
    expect(root.querySelectorAll('button, a, input, select, textarea, [tabindex]')).toHaveLength(0)
    const message = render(<RadarChart columns={[]} rows={[]} pool={[]} />)
    expect(message.container.querySelectorAll('button, a, [tabindex]')).toHaveLength(0)
  })
})

describe('RadarChart Teams (AC17)', () => {
  const keys = ['ztpts', 'ztlow', 'ztwin']
  it('AC17: Teams with 3 stats render the same structure', () => {
    renderTeams(keys)
    expect(screen.getByRole('group', { name: 'Radar chart' })).toBeInTheDocument()
    expect(screen.getAllByTestId('radar-ring')).toHaveLength(4)
    expect(screen.getAllByTestId('radar-spoke')).toHaveLength(3)
    expect(series()).toHaveLength(3)
    expect(screen.getAllByTestId('radar-label').map((l) => l.textContent)).toEqual([
      'Ztpts',
      'Ztlow',
      'Ztwin',
    ])
    expect(legendItems()).toHaveLength(3)
    expect(screen.getByText(CAPTION)).toBeInTheDocument()
  })
  it('AC17: Teams invert the lower-is-better stat (pool minimum 18.2 at full radius)', () => {
    renderTeams(keys)
    expect(pointsOf(series()[1])).toContain('389.9,285')
    expect(pointsOf(series()[0])?.split(' ')[0]).toBe('260,60')
  })
  it('AC17: Teams show the legend names and meta', () => {
    renderTeams(keys)
    expect(within(legendItems()[0]).getByText('Zephyr Flarns')).toBeInTheDocument()
    expect(within(legendItems()[0]).getByText('zteammeta zt1')).toBeInTheDocument()
  })
  it('AC4: the 2 default team stats show the message', () => {
    renderTeams(['ztpts', 'ztlow'])
    expect(screen.getByText(MESSAGE)).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Radar chart' })).toBeNull()
    expect(screen.getByText('Zephyr Flarns')).toBeInTheDocument()
  })
})
