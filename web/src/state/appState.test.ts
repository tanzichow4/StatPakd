import { describe, expect, it } from 'vitest'
import { nflStatDefsByKind, nflUiDefaults } from '../data/nfl'
import {
  createAppReducer,
  createInitialState,
  createReducerConfig,
  type AppAction,
  type AppState,
} from './appState'
import { deepFreeze } from './testUtils'

const defaults = nflUiDefaults()
const reducer = createAppReducer(createReducerConfig(defaults, nflStatDefsByKind()))
const initial = (): AppState => createInitialState(nflUiDefaults())
const make = (o: Partial<AppState> = {}): AppState => ({ ...initial(), ...o })
const ids = (n: number) => Array.from({ length: n }, (_, i) => `x${i + 1}`)

/** Keys whose values differ between two states, excluding the allowed ones. */
function changedOutside(before: AppState, after: AppState, allowed: (keyof AppState)[]) {
  return (Object.keys(before) as (keyof AppState)[]).filter(
    (k) => !allowed.includes(k) && JSON.stringify(after[k]) !== JSON.stringify(before[k]),
  )
}

describe('AC4: toggling an entity', () => {
  it('AC4: appends an unselected id to the end', () => {
    const s = reducer(initial(), { type: 'toggleEntity', id: 'mahomes' })
    expect(s.sel.players).toEqual(['allen', 'barkley', 'chase', 'mahomes'])
  })
  it('AC4: removes a present id and keeps the order of the rest', () => {
    const s = reducer(initial(), { type: 'toggleEntity', id: 'barkley' })
    expect(s.sel.players).toEqual(['allen', 'chase'])
  })
  it('AC4: can remove the last remaining id (selection may become empty)', () => {
    const s = reducer(make({ sel: { players: ['allen'], teams: ['kc'] } }), {
      type: 'toggleEntity',
      id: 'allen',
    })
    expect(s.sel.players).toEqual([])
  })
  it('AC4: remove then re-add puts the id at the end', () => {
    let s = reducer(initial(), { type: 'toggleEntity', id: 'allen' })
    s = reducer(s, { type: 'toggleEntity', id: 'allen' })
    expect(s.sel.players).toEqual(['barkley', 'chase', 'allen'])
  })
  it('AC4: acts on teams when kind is teams', () => {
    const s = reducer(make({ kind: 'teams' }), { type: 'toggleEntity', id: 'phi' })
    expect(s.sel.teams).toEqual(['kc', 'det', 'bal', 'phi'])
  })
})

describe('AC5/AC6: the 8 entity limit', () => {
  const full = () => make({ sel: { players: ids(8), teams: ['kc'] } })
  it('AC5: toggling a new id at 8 leaves the selection unchanged', () => {
    const s = reducer(full(), { type: 'toggleEntity', id: 'new' })
    expect(s.sel.players).toEqual(ids(8))
  })
  it('AC5: toggling a new id at 8 keeps an open popover as it was', () => {
    const before = make({ sel: { players: ids(8), teams: ['kc'] }, addOpen: true })
    const s = reducer(before, { type: 'toggleEntity', id: 'new' })
    expect(s.sel.players).toEqual(ids(8))
    expect(s.addOpen).toBe(true)
  })
  it('AC5: removing from 8 still works', () => {
    const s = reducer(full(), { type: 'toggleEntity', id: 'x3' })
    expect(s.sel.players).toHaveLength(7)
    expect(s.sel.players).not.toContain('x3')
  })
  it('AC6: adding the 8th id closes an open popover', () => {
    const s = reducer(make({ sel: { players: ids(7), teams: ['kc'] }, addOpen: true }), {
      type: 'toggleEntity',
      id: 'x8',
    })
    expect(s.sel.players).toHaveLength(8)
    expect(s.addOpen).toBe(false)
  })
  it('AC6: adding the 7th id leaves addOpen unchanged', () => {
    const s = reducer(make({ sel: { players: ids(6), teams: ['kc'] }, addOpen: true }), {
      type: 'toggleEntity',
      id: 'x7',
    })
    expect(s.sel.players).toHaveLength(7)
    expect(s.addOpen).toBe(true)
  })
  it('AC6: removing an id (7 left) leaves an open popover open', () => {
    const s = reducer({ ...full(), addOpen: true }, { type: 'toggleEntity', id: 'x1' })
    expect(s.addOpen).toBe(true)
  })
  it('AC6: the limit applies per kind (teams)', () => {
    const s = reducer(
      make({ kind: 'teams', sel: { players: ['a'], teams: ids(7) }, addOpen: true }),
      {
        type: 'toggleEntity',
        id: 'x8',
      },
    )
    expect(s.sel.teams).toHaveLength(8)
    expect(s.addOpen).toBe(false)
  })
})

describe('AC7: separate selections per kind', () => {
  it('AC7: toggling players never changes teams and vice versa', () => {
    const a = reducer(initial(), { type: 'toggleEntity', id: 'p9' })
    expect(a.sel.teams).toEqual(['kc', 'det', 'bal'])
    const b = reducer(make({ kind: 'teams' }), { type: 'toggleEntity', id: 't9' })
    expect(b.sel.players).toEqual(['allen', 'barkley', 'chase'])
  })
  it('AC7: switching kind and back shows the earlier list unchanged', () => {
    let s = reducer(initial(), { type: 'toggleEntity', id: 'p9' })
    s = reducer(s, { type: 'setKind', kind: 'teams' })
    s = reducer(s, { type: 'toggleEntity', id: 't9' })
    s = reducer(s, { type: 'setKind', kind: 'players' })
    expect(s.sel.players).toEqual(['allen', 'barkley', 'chase', 'p9'])
    expect(s.sel.teams).toEqual(['kc', 'det', 'bal', 't9'])
  })
})

describe('AC8: removing stats', () => {
  it('AC8: toggling a selected stat removes it', () => {
    const s = reducer(initial(), { type: 'toggleStat', key: 'passTd' })
    expect(s.stats.players).toEqual(['passYds', 'rushYds', 'recYds', 'scrim', 'totTd'])
  })
  it('AC8: the only selected stat cannot be removed (boundary 1)', () => {
    const before = make({ stats: { players: ['passYds'], teams: ['ppg'] } })
    expect(reducer(before, { type: 'toggleStat', key: 'passYds' }).stats.players).toEqual([
      'passYds',
    ])
  })
  it('AC8: going from 2 to 1 is allowed', () => {
    const before = make({ stats: { players: ['passYds', 'rushYds'], teams: ['ppg'] } })
    expect(reducer(before, { type: 'toggleStat', key: 'passYds' }).stats.players).toEqual([
      'rushYds',
    ])
  })
  it('AC8: the minimum applies to teams too', () => {
    const before = make({ kind: 'teams', stats: { players: ['passYds'], teams: ['ppg'] } })
    expect(reducer(before, { type: 'toggleStat', key: 'ppg' }).stats.teams).toEqual(['ppg'])
  })
})

describe('AC9: canonical order when adding stats', () => {
  const base = () => make({ stats: { players: ['passYds', 'rushYds'], teams: ['ppg'] } })
  const adders = ['toggleStat', 'addStat'] as const
  it.each(adders)('AC9: %s inserts int between passYds and rushYds', (type) => {
    const s = reducer(base(), { type, key: 'int' })
    expect(s.stats.players).toEqual(['passYds', 'int', 'rushYds'])
  })
  it.each(adders)('AC9: %s places the extra passYpg inside its group', (type) => {
    const s = reducer(base(), { type, key: 'passYpg' })
    expect(s.stats.players).toEqual(['passYds', 'passYpg', 'rushYds'])
  })
  it.each(adders)('AC9: %s adding a later stat then earlier ones still sorts', (type) => {
    let s = reducer(base(), { type, key: 'totTd' })
    s = reducer(s, { type, key: 'rushTd' })
    s = reducer(s, { type, key: 'cmp' })
    expect(s.stats.players).toEqual(['passYds', 'cmp', 'rushYds', 'rushTd', 'totTd'])
  })
  it('AC9: team extras (yapg) sort within the Defense group', () => {
    const s = reducer(make({ kind: 'teams' }), { type: 'addStat', key: 'yapg' })
    expect(s.stats.teams).toEqual(['ppg', 'ypg', 'third', 'papg', 'yapg', 'to', 'win'])
  })
  it('AC9: an unsorted stored list gets sorted after an add', () => {
    const s = reducer(make({ stats: { players: ['totTd', 'passYds'], teams: ['ppg'] } }), {
      type: 'addStat',
      key: 'int',
    })
    expect(s.stats.players).toEqual(['passYds', 'int', 'totTd'])
  })
})

describe('AC10: add stat from menu closes the menu', () => {
  it('AC10: addStat sets addStatOpen to null', () => {
    const s = reducer(make({ addStatOpen: 'Passing' }), { type: 'addStat', key: 'int' })
    expect(s.addStatOpen).toBeNull()
    expect(s.stats.players).toContain('int')
  })
  it('AC10: addStat of an already selected key still closes the menu, stats unchanged', () => {
    const s = reducer(make({ addStatOpen: 'Passing' }), { type: 'addStat', key: 'passYds' })
    expect(s.addStatOpen).toBeNull()
    expect(s.stats.players).toEqual(initial().stats.players)
  })
  it('AC10: toggleStat does not touch addStatOpen', () => {
    const s = reducer(make({ addStatOpen: 'Passing' }), { type: 'toggleStat', key: 'int' })
    expect(s.addStatOpen).toBe('Passing')
  })
})

describe('AC11: unknown stat keys and duplicates', () => {
  it.each(['toggleStat', 'addStat'] as const)(
    'AC11: %s with an unknown key leaves state unchanged',
    (type) => {
      const before = initial()
      expect(reducer(before, { type, key: 'nope' })).toEqual(before)
    },
  )
  it('AC11: a team key is ignored while kind is players', () => {
    const s = reducer(initial(), { type: 'toggleStat', key: 'ppg' })
    expect(s.stats.players).toEqual(initial().stats.players)
  })
  it('AC11: empty and prototype-ish keys are ignored', () => {
    for (const key of ['', 'constructor', '__proto__', 'toString']) {
      expect(reducer(initial(), { type: 'toggleStat', key })).toEqual(initial())
    }
  })
  it('AC11: addStat of a selected key never duplicates', () => {
    const s = reducer(initial(), { type: 'addStat', key: 'passYds' })
    expect(new Set(s.stats.players).size).toBe(s.stats.players.length)
    expect(s.stats.players).toEqual(initial().stats.players)
  })
})

describe('AC12: add-stat menu group', () => {
  it('AC12: opens for a group', () => {
    expect(reducer(initial(), { type: 'toggleAddStatMenu', group: 'Passing' }).addStatOpen).toBe(
      'Passing',
    )
  })
  it('AC12: the same group again closes it', () => {
    const s = reducer(make({ addStatOpen: 'Passing' }), {
      type: 'toggleAddStatMenu',
      group: 'Passing',
    })
    expect(s.addStatOpen).toBeNull()
  })
  it('AC12: another group switches to it', () => {
    const s = reducer(make({ addStatOpen: 'Passing' }), {
      type: 'toggleAddStatMenu',
      group: 'Rushing',
    })
    expect(s.addStatOpen).toBe('Rushing')
  })
  it('AC12: changes nothing else', () => {
    const before = initial()
    const s = reducer(before, { type: 'toggleAddStatMenu', group: 'Passing' })
    expect(changedOutside(before, s, ['addStatOpen'])).toEqual([])
  })
})

describe('AC13: stats are separate per kind', () => {
  it('AC13: player stat changes leave team stats alone', () => {
    const s = reducer(initial(), { type: 'toggleStat', key: 'int' })
    expect(s.stats.teams).toEqual(['ppg', 'ypg', 'third', 'papg', 'to', 'win'])
  })
  it('AC13: team stat changes leave player stats alone', () => {
    const s = reducer(make({ kind: 'teams' }), { type: 'addStat', key: 'pass' })
    expect(s.stats.teams).toContain('pass')
    expect(s.stats.players).toEqual(initial().stats.players)
  })
})

describe('AC14: switching kind', () => {
  const dirty = () =>
    make({ q: 'jo', pos: 'QB', addOpen: true, addStatOpen: 'Passing', view: '2d', season: '2023' })
  it('AC14: sets kind and resets q, pos and addOpen', () => {
    const s = reducer(dirty(), { type: 'setKind', kind: 'teams' })
    expect(s).toMatchObject({ kind: 'teams', q: '', pos: 'All', addOpen: false })
  })
  it('AC14: also resets when switching to the active kind', () => {
    const s = reducer(dirty(), { type: 'setKind', kind: 'players' })
    expect(s).toMatchObject({ kind: 'players', q: '', pos: 'All', addOpen: false })
  })
  it('AC14: leaves sel, stats, ax, season, view unchanged', () => {
    const before = dirty()
    const s = reducer(before, { type: 'setKind', kind: 'teams' })
    expect(changedOutside(before, s, ['kind', 'q', 'pos', 'addOpen'])).toEqual([])
  })
  it('AC14: does not reset addStatOpen (assumption A7)', () => {
    expect(reducer(dirty(), { type: 'setKind', kind: 'teams' }).addStatOpen).toBe('Passing')
  })
})

describe('AC15: changing season', () => {
  it('AC15: sets season and changes nothing else', () => {
    const before = make({ q: 'x', addOpen: true, kind: 'teams', view: 'num' })
    const s = reducer(before, { type: 'setSeason', season: '2022' })
    expect(s.season).toBe('2022')
    expect(changedOutside(before, s, ['season'])).toEqual([])
  })
  it('AC15: does not prune selections even for unknown ids', () => {
    const before = make({ sel: { players: ['ghost'], teams: ['kc'] } })
    expect(reducer(before, { type: 'setSeason', season: '2022' }).sel).toEqual(before.sel)
  })
})

describe('AC16: search and position filter', () => {
  it('AC16: setQuery sets q only', () => {
    const before = initial()
    const s = reducer(before, { type: 'setQuery', q: 'jos' })
    expect(s.q).toBe('jos')
    expect(changedOutside(before, s, ['q'])).toEqual([])
  })
  it('AC16: setQuery accepts the empty string', () => {
    expect(reducer(make({ q: 'abc' }), { type: 'setQuery', q: '' }).q).toBe('')
  })
  it('AC16: setPos sets pos only', () => {
    const before = initial()
    const s = reducer(before, { type: 'setPos', pos: 'WR' })
    expect(s.pos).toBe('WR')
    expect(changedOutside(before, s, ['pos'])).toEqual([])
  })
})

describe('AC17: add popover', () => {
  it('AC17: toggleAdd opens and clears q', () => {
    const s = reducer(make({ q: 'abc' }), { type: 'toggleAdd' })
    expect(s.addOpen).toBe(true)
    expect(s.q).toBe('')
  })
  it('AC17: toggleAdd closes when open and clears q', () => {
    const s = reducer(make({ addOpen: true, q: 'abc' }), { type: 'toggleAdd' })
    expect(s.addOpen).toBe(false)
    expect(s.q).toBe('')
  })
  it('AC17: toggleAdd is allowed with 8 selected', () => {
    const s = reducer(make({ sel: { players: ids(8), teams: ['kc'] } }), { type: 'toggleAdd' })
    expect(s.addOpen).toBe(true)
  })
  it('AC17: closeAdd sets addOpen false', () => {
    expect(reducer(make({ addOpen: true }), { type: 'closeAdd' }).addOpen).toBe(false)
    expect(reducer(make({ addOpen: false }), { type: 'closeAdd' }).addOpen).toBe(false)
  })
  it('AC17: closeAdd leaves q untouched', () => {
    expect(reducer(make({ addOpen: true, q: 'abc' }), { type: 'closeAdd' }).q).toBe('abc')
  })
})

describe('AC18: view and chart2', () => {
  it.each(['num', '2d', '3d'] as const)('AC18: setView %s stores only the view', (view) => {
    const before = make({ view: view === '3d' ? 'num' : '3d' })
    const s = reducer(before, { type: 'setView', view })
    expect(s.view).toBe(view)
    expect(changedOutside(before, s, ['view'])).toEqual([])
  })
  it.each(['bars', 'radar'] as const)('AC18: setChart2 %s stores only chart2', (chart2) => {
    const before = make({ chart2: chart2 === 'bars' ? 'radar' : 'bars' })
    const s = reducer(before, { type: 'setChart2', chart2 })
    expect(s.chart2).toBe(chart2)
    expect(changedOutside(before, s, ['chart2'])).toEqual([])
  })
})

describe('AC19: setting an axis', () => {
  it.each([
    [0, ['int', 'recYds', 'totTd']],
    [1, ['rushYds', 'int', 'totTd']],
    [2, ['rushYds', 'recYds', 'int']],
  ] as const)('AC19: slot %i replaces only that slot', (index, expected) => {
    const before = initial()
    const s = reducer(before, { type: 'setAxis', index, key: 'int' })
    expect(s.ax.players).toEqual(expected)
    expect(s.ax.teams).toEqual(before.ax.teams)
    expect(changedOutside(before, s, ['ax'])).toEqual([])
  })
  it('AC19: accepts a key that is not selected', () => {
    const s = reducer(initial(), { type: 'setAxis', index: 0, key: 'ypt' })
    expect(s.ax.players[0]).toBe('ypt')
    expect(s.stats.players).not.toContain('ypt')
  })
  it('AC19: uses the current kind (teams)', () => {
    const s = reducer(make({ kind: 'teams' }), { type: 'setAxis', index: 1, key: 'win' })
    expect(s.ax.teams).toEqual(['ppg', 'win', 'to'])
    expect(s.ax.players).toEqual(['rushYds', 'recYds', 'totTd'])
  })
  it('AC19: the same key may be used in two slots', () => {
    const s = reducer(initial(), { type: 'setAxis', index: 0, key: 'recYds' })
    expect(s.ax.players).toEqual(['recYds', 'recYds', 'totTd'])
  })
})

describe('AC30: invalid axis input', () => {
  it.each(['ppg', 'nope', ''])('AC30: key %j is ignored', (key) => {
    const before = initial()
    expect(reducer(before, { type: 'setAxis', index: 0, key })).toBe(before)
  })
  it.each([-1, 3, 1.5, NaN, 99])('AC30: index %s is ignored', (index) => {
    const before = initial()
    const action = { type: 'setAxis', index, key: 'int' } as unknown as AppAction
    expect(reducer(before, action)).toEqual(before)
  })
})

describe('AC20/AC21/AC31: camera', () => {
  it.each([
    [2, 1.3],
    [-1, -0.2],
    [0.5, 0.5],
    [1.3, 1.3],
    [-0.2, -0.2],
    [1.3000001, 1.3],
    [-0.2000001, -0.2],
    [0, 0],
  ])('AC20: pitch %s is stored as %s', (pitch, expected) => {
    expect(reducer(initial(), { type: 'setCamera', yaw: 0, pitch }).pitch).toBe(expected)
  })
  it.each([0, 1, -7.5, 100, -100])('AC20: yaw %s is stored as given (no clamp or wrap)', (yaw) => {
    expect(reducer(initial(), { type: 'setCamera', yaw, pitch: 0.4 }).yaw).toBe(yaw)
  })
  it('AC20: changes only yaw and pitch', () => {
    const before = initial()
    const s = reducer(before, { type: 'setCamera', yaw: 1, pitch: 0.1 })
    expect(changedOutside(before, s, ['yaw', 'pitch'])).toEqual([])
  })
  it('AC21: resetView restores -0.65 and 0.38', () => {
    const s = reducer(make({ yaw: 3, pitch: 1 }), { type: 'resetView' })
    expect(s.yaw).toBe(-0.65)
    expect(s.pitch).toBe(0.38)
  })
  it('AC21: resetView changes nothing else', () => {
    const before = make({ yaw: 3, pitch: 1, view: '2d' })
    expect(
      changedOutside(before, reducer(before, { type: 'resetView' }), ['yaw', 'pitch']),
    ).toEqual([])
  })
  it.each([
    [NaN, 0.5],
    [0.5, NaN],
    [Infinity, 0.5],
    [0.5, -Infinity],
    [NaN, NaN],
  ])('AC31: setCamera(%s, %s) is ignored', (yaw, pitch) => {
    const before = make({ yaw: 1, pitch: 0.2 })
    expect(reducer(before, { type: 'setCamera', yaw, pitch })).toBe(before)
  })
})

describe('AC22: team mode', () => {
  it.each(['compare', 'inside'] as const)('AC22: setTeamMode %s closes the popover', (mode) => {
    const before = make({ addOpen: true, teamMode: mode === 'inside' ? 'compare' : 'inside' })
    const s = reducer(before, { type: 'setTeamMode', mode })
    expect(s.teamMode).toBe(mode)
    expect(s.addOpen).toBe(false)
    expect(changedOutside(before, s, ['teamMode', 'addOpen'])).toEqual([])
  })
})

describe('AC23: select team', () => {
  it('AC23: sets teamId and nothing else', () => {
    const before = make({ addOpen: true, q: 'z' })
    const s = reducer(before, { type: 'setTeam', teamId: 'kc' })
    expect(s.teamId).toBe('kc')
    expect(changedOutside(before, s, ['teamId'])).toEqual([])
  })
})

describe('AC24: roster unit', () => {
  it('AC24: sets unit and resets tSort to the injected default key, descending', () => {
    const before = make({ tSort: { k: 'rushYds', d: 1 } })
    const s = reducer(before, { type: 'setUnit', unit: 'def' })
    expect(s.unit).toBe('def')
    expect(s.tSort).toEqual({ k: defaults.sortKey, d: -1 })
    expect(changedOutside(before, s, ['unit', 'tSort'])).toEqual([])
  })
  it('AC24: resets tSort even when the unit is the same', () => {
    const s = reducer(make({ tSort: { k: 'x', d: 1 } }), { type: 'setUnit', unit: 'off' })
    expect(s.tSort).toEqual({ k: defaults.sortKey, d: -1 })
  })
})

describe('AC25: roster sort', () => {
  it('AC25: a new key sorts descending first', () => {
    const s = reducer(make({ tSort: { k: 'snap', d: 1 } }), { type: 'sortRoster', key: 'age' })
    expect(s.tSort).toEqual({ k: 'age', d: -1 })
  })
  it('AC25: the same key flips -1 to 1', () => {
    const s = reducer(make({ tSort: { k: 'snap', d: -1 } }), { type: 'sortRoster', key: 'snap' })
    expect(s.tSort).toEqual({ k: 'snap', d: 1 })
  })
  it('AC25: the same key flips 1 to -1', () => {
    const s = reducer(make({ tSort: { k: 'snap', d: 1 } }), { type: 'sortRoster', key: 'snap' })
    expect(s.tSort).toEqual({ k: 'snap', d: -1 })
  })
  it('AC25: three presses of the same key end ascending', () => {
    let s = initial()
    for (let i = 0; i < 3; i++) s = reducer(s, { type: 'sortRoster', key: 'snap' })
    expect(s.tSort.d).toBe(1)
  })
  it('AC25: changes only tSort', () => {
    const before = initial()
    expect(
      changedOutside(before, reducer(before, { type: 'sortRoster', key: 'age' }), ['tSort']),
    ).toEqual([])
  })
})

describe('AC32: no-op actions return the same reference', () => {
  const full = () => make({ sel: { players: ids(8), teams: ['kc'] } })
  const single = () => make({ stats: { players: ['passYds'], teams: ['ppg'] } })
  const cases: [string, () => AppState, AppAction][] = [
    ['AC5 toggle new id at 8', full, { type: 'toggleEntity', id: 'new' }],
    ['AC8 remove the only stat', single, { type: 'toggleStat', key: 'passYds' }],
    ['AC11 toggleStat unknown', initial, { type: 'toggleStat', key: 'nope' }],
    ['AC30 setAxis unknown key', initial, { type: 'setAxis', index: 0, key: 'nope' }],
    ['AC30 setAxis bad index', initial, { type: 'setAxis', index: 5 as 0, key: 'int' }],
    ['AC31 setCamera NaN', initial, { type: 'setCamera', yaw: NaN, pitch: 0 }],
    ['unknown action type', initial, { type: 'bogus' } as unknown as AppAction],
  ]
  it.each(cases)('AC32: %s', (_name, build, action) => {
    const before = build()
    expect(reducer(before, action)).toBe(before)
  })
})

describe('AC26: purity', () => {
  const actions: AppAction[] = [
    { type: 'toggleEntity', id: 'mahomes' },
    { type: 'toggleEntity', id: 'allen' },
    { type: 'toggleStat', key: 'int' },
    { type: 'toggleStat', key: 'passYds' },
    { type: 'addStat', key: 'passYpg' },
    { type: 'toggleAddStatMenu', group: 'Passing' },
    { type: 'setKind', kind: 'teams' },
    { type: 'setSeason', season: '2023' },
    { type: 'setQuery', q: 'abc' },
    { type: 'setPos', pos: 'QB' },
    { type: 'toggleAdd' },
    { type: 'closeAdd' },
    { type: 'setView', view: 'num' },
    { type: 'setChart2', chart2: 'radar' },
    { type: 'setAxis', index: 2, key: 'int' },
    { type: 'setCamera', yaw: 1, pitch: 5 },
    { type: 'resetView' },
    { type: 'setTeamMode', mode: 'inside' },
    { type: 'setTeam', teamId: 'kc' },
    { type: 'setUnit', unit: 'def' },
    { type: 'sortRoster', key: 'snap' },
    { type: 'sortRoster', key: 'age' },
  ]
  const states: [string, () => AppState][] = [
    ['players', initial],
    ['teams', () => make({ kind: 'teams', addOpen: true, addStatOpen: 'Passing' })],
  ]
  describe.each(states)('on %s state', (_name, build) => {
    it.each(actions.map((a, i) => [`${i} ${a.type}`, a] as const))(
      'AC26: %s does not mutate frozen input and is deterministic',
      (_label, action) => {
        const frozen = deepFreeze(build())
        const snapshot = structuredClone(frozen)
        const frozenAction = deepFreeze(structuredClone(action))
        const first = reducer(frozen, frozenAction)
        const second = reducer(frozen, frozenAction)
        expect(first).toEqual(second)
        expect(frozen).toEqual(snapshot)
      },
    )
  })
  it('AC26: returns a new object (not the frozen input) when something changed', () => {
    const frozen = deepFreeze(initial())
    const s = reducer(frozen, { type: 'toggleEntity', id: 'mahomes' })
    expect(s).not.toBe(frozen)
    expect(s.sel).not.toBe(frozen.sel)
  })
  it('AC26: initial state does not share mutable arrays with the injected defaults', () => {
    const d = nflUiDefaults()
    const s = createInitialState(d)
    expect(s.sel.players).not.toBe(d.players.sel)
    expect(s.stats.teams).not.toBe(d.teams.stats)
    expect(s.ax.players).not.toBe(d.players.ax)
    s.sel.players.push('zzz')
    expect(d.players.sel).toEqual(['allen', 'barkley', 'chase'])
  })
})
