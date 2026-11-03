import { describe, expect, it } from 'vitest'
import type { LeagueUiDefaults, StatDef } from '../domain/types'
import {
  canonicalStatOrder,
  createAppReducer,
  createInitialState,
  createReducerConfig,
  type AppState,
} from './appState'
import { deepFreeze } from './testUtils'

// A made-up league: nothing here overlaps with the NFL data.
const def = (key: string, group: string, extra = false): StatDef => ({
  key,
  label: key.toUpperCase(),
  group,
  ...(extra ? { extra: true } : {}),
})
const statDefs = {
  players: [
    def('a1', 'Alpha'),
    def('a2', 'Alpha'),
    def('b1', 'Beta'),
    def('b2', 'Beta'),
    def('ax1', 'Alpha', true),
  ],
  teams: [def('g1', 'Gamma'), def('g2', 'Gamma'), def('d1', 'Delta'), def('gx', 'Gamma', true)],
}
const defaults: LeagueUiDefaults = {
  season: 'S9',
  teamId: 't1',
  unit: 'u1',
  sortKey: 'k1',
  players: { sel: ['e1', 'e2', 'e3'], stats: ['a1', 'b1'], ax: ['a1', 'b1', 'b2'] },
  teams: { sel: ['t1', 't2'], stats: ['g1', 'd1'], ax: ['g1', 'g2', 'd1'] },
}
const reducer = createAppReducer(createReducerConfig(defaults, statDefs))
const initial = (): AppState => createInitialState(structuredClone(defaults))
const make = (o: Partial<AppState> = {}): AppState => ({ ...initial(), ...o })

describe('AC2: the reducer works with a non-NFL league', () => {
  it('AC2: initial state is built from the injected defaults', () => {
    expect(initial()).toMatchObject({
      kind: 'players',
      season: 'S9',
      teamId: 't1',
      unit: 'u1',
      tSort: { k: 'k1', d: -1 },
      view: '3d',
      chart2: 'bars',
      q: '',
      pos: 'All',
      addOpen: false,
      addStatOpen: null,
      teamMode: 'compare',
      yaw: -0.65,
      pitch: 0.38,
    })
    expect(initial().sel).toEqual({ players: ['e1', 'e2', 'e3'], teams: ['t1', 't2'] })
    expect(initial().stats.teams).toEqual(['g1', 'd1'])
    expect(initial().ax.players).toEqual(['a1', 'b1', 'b2'])
  })
  it('AC2: canonical order puts the extra ax1 inside its group', () => {
    expect(canonicalStatOrder(statDefs.players)).toEqual(['a1', 'a2', 'ax1', 'b1', 'b2'])
    expect(canonicalStatOrder(statDefs.teams)).toEqual(['g1', 'g2', 'gx', 'd1'])
  })
  it('AC2/AC4: toggles ids, appends and removes', () => {
    let s = reducer(initial(), { type: 'toggleEntity', id: 'e4' })
    expect(s.sel.players).toEqual(['e1', 'e2', 'e3', 'e4'])
    s = reducer(s, { type: 'toggleEntity', id: 'e2' })
    expect(s.sel.players).toEqual(['e1', 'e3', 'e4'])
  })
  it('AC2/AC5/AC6: the 8 limit and closing the popover', () => {
    let s = make({ addOpen: true })
    for (const id of ['e4', 'e5', 'e6', 'e7']) s = reducer(s, { type: 'toggleEntity', id })
    expect(s.sel.players).toHaveLength(7)
    expect(s.addOpen).toBe(true)
    s = reducer(s, { type: 'toggleEntity', id: 'e8' })
    expect(s.sel.players).toHaveLength(8)
    expect(s.addOpen).toBe(false)
    s = reducer(s, { type: 'toggleEntity', id: 'e9' })
    expect(s.sel.players).not.toContain('e9')
  })
  it('AC2/AC7: kinds keep separate selections', () => {
    let s = reducer(initial(), { type: 'setKind', kind: 'teams' })
    s = reducer(s, { type: 'toggleEntity', id: 't3' })
    expect(s.sel.teams).toEqual(['t1', 't2', 't3'])
    expect(s.sel.players).toEqual(['e1', 'e2', 'e3'])
  })
  it('AC2/AC8: removes a stat but keeps the last one', () => {
    let s = reducer(initial(), { type: 'toggleStat', key: 'a1' })
    expect(s.stats.players).toEqual(['b1'])
    s = reducer(s, { type: 'toggleStat', key: 'b1' })
    expect(s.stats.players).toEqual(['b1'])
  })
  it('AC2/AC9: adding stats keeps canonical order, extras inside their group', () => {
    let s = reducer(initial(), { type: 'toggleStat', key: 'ax1' })
    expect(s.stats.players).toEqual(['a1', 'ax1', 'b1'])
    s = reducer(s, { type: 'addStat', key: 'a2' })
    expect(s.stats.players).toEqual(['a1', 'a2', 'ax1', 'b1'])
  })
  it('AC2/AC10/AC11: addStat closes the menu; unknown (NFL) keys are ignored', () => {
    const s = reducer(make({ addStatOpen: 'Beta' }), { type: 'addStat', key: 'b2' })
    expect(s.addStatOpen).toBeNull()
    expect(s.stats.players).toEqual(['a1', 'b1', 'b2'])
    const before = initial()
    expect(reducer(before, { type: 'toggleStat', key: 'passYds' })).toBe(before)
  })
  it('AC2/AC12: add-stat menu group toggling', () => {
    let s = reducer(initial(), { type: 'toggleAddStatMenu', group: 'Alpha' })
    expect(s.addStatOpen).toBe('Alpha')
    s = reducer(s, { type: 'toggleAddStatMenu', group: 'Beta' })
    expect(s.addStatOpen).toBe('Beta')
    s = reducer(s, { type: 'toggleAddStatMenu', group: 'Beta' })
    expect(s.addStatOpen).toBeNull()
  })
  it('AC2/AC13: team stats use the team order and leave players alone', () => {
    const s = reducer(make({ kind: 'teams' }), { type: 'toggleStat', key: 'gx' })
    expect(s.stats.teams).toEqual(['g1', 'gx', 'd1'])
    expect(s.stats.players).toEqual(['a1', 'b1'])
  })
  it('AC2/AC14/AC15: kind and season', () => {
    const dirty = make({ q: 'z', pos: 'P', addOpen: true })
    const k = reducer(dirty, { type: 'setKind', kind: 'teams' })
    expect(k).toMatchObject({ kind: 'teams', q: '', pos: 'All', addOpen: false })
    const s = reducer(dirty, { type: 'setSeason', season: 'S8' })
    expect(s).toEqual({ ...dirty, season: 'S8' })
  })
  it('AC2/AC16/AC17: search, position, popover', () => {
    expect(reducer(initial(), { type: 'setQuery', q: 'hi' }).q).toBe('hi')
    expect(reducer(initial(), { type: 'setPos', pos: 'Z' }).pos).toBe('Z')
    const s = reducer(make({ q: 'hi' }), { type: 'toggleAdd' })
    expect(s).toMatchObject({ addOpen: true, q: '' })
    expect(reducer(s, { type: 'closeAdd' }).addOpen).toBe(false)
  })
  it('AC2/AC18: views', () => {
    expect(reducer(initial(), { type: 'setView', view: 'num' }).view).toBe('num')
    expect(reducer(initial(), { type: 'setChart2', chart2: 'radar' }).chart2).toBe('radar')
  })
  it('AC2/AC19/AC30: axes accept league keys only', () => {
    const s = reducer(initial(), { type: 'setAxis', index: 0, key: 'a2' })
    expect(s.ax.players).toEqual(['a2', 'b1', 'b2'])
    const before = initial()
    expect(reducer(before, { type: 'setAxis', index: 0, key: 'g1' })).toBe(before)
    expect(reducer(before, { type: 'setAxis', index: 1, key: 'recYds' })).toBe(before)
  })
  it('AC2/AC20/AC21/AC31: camera', () => {
    expect(reducer(initial(), { type: 'setCamera', yaw: 2, pitch: 9 })).toMatchObject({
      yaw: 2,
      pitch: 1.3,
    })
    expect(reducer(make({ yaw: 5, pitch: 1 }), { type: 'resetView' })).toMatchObject({
      yaw: -0.65,
      pitch: 0.38,
    })
    const before = initial()
    expect(reducer(before, { type: 'setCamera', yaw: NaN, pitch: 0 })).toBe(before)
  })
  it('AC2/AC22/AC23: team mode and team', () => {
    const s = reducer(make({ addOpen: true }), { type: 'setTeamMode', mode: 'inside' })
    expect(s).toMatchObject({ teamMode: 'inside', addOpen: false })
    expect(reducer(initial(), { type: 'setTeam', teamId: 't2' }).teamId).toBe('t2')
  })
  it('AC2/AC24/AC25: unit and sort use the injected sort key', () => {
    const s = reducer(make({ tSort: { k: 'zz', d: 1 } }), { type: 'setUnit', unit: 'u2' })
    expect(s).toMatchObject({ unit: 'u2', tSort: { k: 'k1', d: -1 } })
    const flipped = reducer(s, { type: 'sortRoster', key: 'k1' })
    expect(flipped.tSort).toEqual({ k: 'k1', d: 1 })
    expect(reducer(flipped, { type: 'sortRoster', key: 'k2' }).tSort).toEqual({ k: 'k2', d: -1 })
  })
  it('AC2/AC26: pure on frozen state', () => {
    const frozen = deepFreeze(initial())
    expect(() => reducer(frozen, { type: 'addStat', key: 'ax1' })).not.toThrow()
    expect(() => reducer(frozen, { type: 'toggleEntity', id: 'e9' })).not.toThrow()
    expect(frozen).toEqual(initial())
  })
})
