import { describe, expect, it } from 'vitest'
import { nflUiDefaults, nflStatDefsByKind } from '../data/nfl'
import { createAppReducer, createInitialState, createReducerConfig, FLAT_VIEWS } from './appState'

const defaults = nflUiDefaults()
const reducer = createAppReducer(createReducerConfig(defaults, nflStatDefsByKind()))
const initial = () => createInitialState(defaults)

describe('week to week state', () => {
  it('starts on season totals with every week and trend lines', () => {
    expect(initial()).toMatchObject({
      playerMode: 'season',
      playoffs: true,
      periods: null,
      weekGraph: 'week',
      trend: true,
      dotX: '',
      dotY: '',
    })
  })

  it('switches view and closes open menus', () => {
    const open = { ...initial(), addOpen: true, addStatOpen: 'x' }
    expect(reducer(open, { type: 'setPlayerMode', mode: 'weeks' })).toMatchObject({
      playerMode: 'weeks',
      addOpen: false,
      addStatOpen: null,
    })
    const same = initial()
    expect(reducer(same, { type: 'setPlayerMode', mode: 'season' })).toBe(same)
  })

  it('stores weeks sorted, unique and valid', () => {
    const s = reducer(initial(), { type: 'setPeriods', periods: [3, 1, 3, 0, -1, 1.5, NaN] })
    expect(s.periods).toEqual([1, 3])
    expect(reducer(s, { type: 'setPeriods', periods: [1, 3] })).toBe(s)
  })

  it('tells no weeks apart from every week', () => {
    const none = reducer(initial(), { type: 'setPeriods', periods: [] })
    expect(none.periods).toEqual([])
    expect(reducer(none, { type: 'setPeriods', periods: null }).periods).toBeNull()
    const all = initial()
    expect(reducer(all, { type: 'setPeriods', periods: null })).toBe(all)
  })

  it.each([
    [{ type: 'setWeekGraph', mode: 'stats' }, { weekGraph: 'stats' }],
    [{ type: 'setWeekX', key: 'k' }, { weekX: 'k' }],
    [{ type: 'setWeekY', key: 'k' }, { weekY: 'k' }],
    [{ type: 'setDotX', key: 'k' }, { dotX: 'k' }],
    [{ type: 'setDotY', key: 'k' }, { dotY: 'k' }],
    [{ type: 'toggleTrend' }, { trend: false }],
    [{ type: 'togglePlayoffs' }, { playoffs: false }],
  ] as const)('applies %o', (action, expected) => {
    expect(reducer(initial(), action)).toMatchObject(expected)
  })
})

describe('flat views', () => {
  it.each(['front', 'side', 'top'] as const)('%s sets its camera without perspective', (preset) => {
    const s = reducer(initial(), { type: 'setCameraPreset', preset })
    expect(s).toMatchObject({ ...FLAT_VIEWS[preset], flat: true })
    expect(reducer(s, { type: 'setCameraPreset', preset })).toBe(s)
  })

  it('3d and reset restore the default camera', () => {
    const top = reducer(initial(), { type: 'setCameraPreset', preset: 'top' })
    for (const next of [
      reducer(top, { type: 'setCameraPreset', preset: '3d' }),
      reducer(top, { type: 'resetView' }),
    ]) {
      expect(next).toMatchObject({ yaw: initial().yaw, pitch: initial().pitch, flat: false })
    }
  })

  it('rotating leaves the flat view and applies the pitch limit again', () => {
    const top = reducer(initial(), { type: 'setCameraPreset', preset: 'top' })
    const s = reducer(top, { type: 'setCamera', yaw: top.yaw, pitch: top.pitch })
    expect(s).toMatchObject({ pitch: 1.3, flat: false })
  })
})
