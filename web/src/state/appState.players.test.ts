import { describe, expect, it } from 'vitest'
import { nflUiDefaults, nflStatDefsByKind } from '../data/nfl'
import { createAppReducer, createInitialState, createReducerConfig, FLAT_VIEWS } from './appState'

const defaults = nflUiDefaults()
const reducer = createAppReducer(createReducerConfig(defaults, nflStatDefsByKind()))
const initial = () => createInitialState(defaults)

describe('player detail state', () => {
  it('starts in comparison with nothing chosen', () => {
    expect(initial()).toMatchObject({
      playerMode: 'compare',
      playerId: '',
      periodStat: '',
      periods: [],
    })
  })

  it('switches mode and closes open menus', () => {
    const open = { ...initial(), addOpen: true, addStatOpen: 'x' }
    expect(reducer(open, { type: 'setPlayerMode', mode: 'detail' })).toMatchObject({
      playerMode: 'detail',
      addOpen: false,
      addStatOpen: null,
    })
    const same = initial()
    expect(reducer(same, { type: 'setPlayerMode', mode: 'compare' })).toBe(same)
  })

  it('toggles periods and keeps them in season order', () => {
    let s = initial()
    for (const period of [5, 2, 9]) s = reducer(s, { type: 'togglePeriod', period })
    expect(s.periods).toEqual([2, 5, 9])
    expect(reducer(s, { type: 'togglePeriod', period: 5 }).periods).toEqual([2, 9])
  })

  it.each([0, -1, 1.5, NaN])('ignores the period %s', (period) => {
    const s = initial()
    expect(reducer(s, { type: 'togglePeriod', period })).toBe(s)
  })

  it('replaces periods with a sorted, unique, valid list', () => {
    const s = reducer(initial(), { type: 'setPeriods', periods: [3, 1, 3, 0] })
    expect(s.periods).toEqual([1, 3])
    expect(reducer(s, { type: 'setPeriods', periods: [1, 3] })).toBe(s)
  })

  it('clears the periods when the player changes', () => {
    const s = { ...initial(), playerId: 'a', periods: [1] }
    expect(reducer(s, { type: 'setPlayer', playerId: 'b' }).periods).toEqual([])
    expect(reducer(s, { type: 'setPlayer', playerId: 'a' })).toBe(s)
  })

  it('stores the chart stat', () => {
    expect(reducer(initial(), { type: 'setPeriodStat', key: 'k' }).periodStat).toBe('k')
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
