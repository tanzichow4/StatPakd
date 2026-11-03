import { describe, expect, it } from 'vitest'
import { canonicalStatOrder, createInitialState } from '../../state/appState'
import { nflStatDefsByKind, nflUiDefaults } from './index'

describe('AC1: NFL defaults match the design', () => {
  it('AC1: the initial state equals the design exactly', () => {
    expect(createInitialState(nflUiDefaults())).toEqual({
      kind: 'players',
      season: '2024',
      sel: { players: ['allen', 'barkley', 'chase'], teams: ['kc', 'det', 'bal'] },
      stats: {
        players: ['passYds', 'passTd', 'rushYds', 'recYds', 'scrim', 'totTd'],
        teams: ['ppg', 'ypg', 'third', 'papg', 'to', 'win'],
      },
      ax: { players: ['rushYds', 'recYds', 'totTd'], teams: ['ppg', 'papg', 'to'] },
      view: '3d',
      chart2: 'bars',
      q: '',
      pos: 'All',
      addOpen: false,
      addStatOpen: null,
      teamMode: 'compare',
      teamId: 'phi',
      unit: 'off',
      tSort: { k: 'snap', d: -1 },
      yaw: -0.65,
      pitch: 0.38,
    })
  })
  it('AC1: the data-layer defaults carry the league values', () => {
    const d = nflUiDefaults()
    expect([d.season, d.teamId, d.unit, d.sortKey]).toEqual(['2024', 'phi', 'off', 'snap'])
  })
  it('AC1: nflUiDefaults returns fresh copies', () => {
    const a = nflUiDefaults()
    a.players.sel.push('zzz')
    a.teams.stats.length = 0
    const b = nflUiDefaults()
    expect(b.players.sel).toEqual(['allen', 'barkley', 'chase'])
    expect(b.teams.stats).toHaveLength(6)
    expect(a.players).not.toBe(b.players)
  })
  it('AC1: nflStatDefsByKind returns fresh copies', () => {
    const a = nflStatDefsByKind()
    a.players.length = 0
    expect(nflStatDefsByKind().players.length).toBeGreaterThan(0)
  })
  it.each(['players', 'teams'] as const)('AC1: %s default keys exist in the defs', (kind) => {
    const keys = new Set(nflStatDefsByKind()[kind].map((s) => s.key))
    const d = nflUiDefaults()[kind]
    const missing = [...d.stats, ...d.ax].filter((k) => !keys.has(k))
    expect(missing).toEqual([])
  })
  it.each(['players', 'teams'] as const)('AC1: %s default stats are in canonical order', (kind) => {
    const order = canonicalStatOrder(nflStatDefsByKind()[kind])
    const stats = nflUiDefaults()[kind].stats
    expect(stats).toEqual(order.filter((k) => stats.includes(k)))
  })
  it('AC1: canonical player order places extras inside their group', () => {
    expect(canonicalStatOrder(nflStatDefsByKind().players).slice(0, 8)).toEqual([
      'passYds',
      'passTd',
      'int',
      'cmp',
      'rate',
      'passYpg',
      'tdInt',
      'rushYds',
    ])
  })
})
