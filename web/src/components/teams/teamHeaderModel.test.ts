import { describe, expect, it } from 'vitest'
import type { StatDef } from '../../domain/types'
import { MAX_SELECTED } from '../../state/appState'
import { compareTeams } from '../../test/compareFixtures'
import { findTeam, summaryStats, teamMetaLine, teamModeHint } from './teamHeaderModel'

// Invented defs: summary stats are interleaved with plain ones, one has an empty label.
function defs(): StatDef[] {
  return [
    { key: 'zplain1', label: 'Zplain1', group: 'zg' },
    { key: 'zrate', label: 'Zrate', group: 'zg', decimals: 1, summaryLabel: 'Zr / G' },
    { key: 'zplain2', label: 'Zplain2', group: 'zg', decimals: 0 },
    { key: 'zdiff', label: 'Zdiff', group: 'zg', decimals: 0, signed: true, summaryLabel: 'Zd' },
    { key: 'zempty', label: 'Zempty', group: 'zg', summaryLabel: '' },
    { key: 'zbig', label: 'Zbig', group: 'zg', summaryLabel: 'Zbig tot' },
  ]
}

describe('findTeam', () => {
  it('AC15: returns the entity whose id matches', () => {
    const teams = compareTeams()
    expect(findTeam(teams, 'zt2')).toBe(teams[1])
  })

  it('AC19: returns undefined for an unknown id', () => {
    expect(findTeam(compareTeams(), 'nope')).toBeUndefined()
  })

  it('AC19: returns undefined for an empty list and an empty id', () => {
    expect(findTeam([], 'zt1')).toBeUndefined()
    expect(findTeam(compareTeams(), '')).toBeUndefined()
  })
})

describe('teamMetaLine', () => {
  it('AC15: is exactly "meta · season"', () => {
    const [team] = compareTeams()
    expect(teamMetaLine(team, '3031')).toBe('zteammeta zt1 · 3031')
  })

  it('AC15: does not parse the meta (keeps punctuation as is)', () => {
    const team = { ...compareTeams()[0], meta: 'ZDiv · 5–2' }
    expect(teamMetaLine(team, '3030')).toBe('ZDiv · 5–2 · 3030')
  })
})

describe('summaryStats', () => {
  it('AC16: keeps only defs with a summaryLabel, in definition order, using the label', () => {
    const result = summaryStats(defs(), { zrate: 1, zdiff: 1, zbig: 1 })
    expect(result.map((s) => s.key)).toEqual(['zrate', 'zdiff', 'zbig'])
    expect(result.map((s) => s.label)).toEqual(['Zr / G', 'Zd', 'Zbig tot'])
  })

  it('AC16: order follows the defs, not the stats object', () => {
    const result = summaryStats(defs(), { zbig: 3, zdiff: 2, zrate: 1 })
    expect(result.map((s) => s.key)).toEqual(['zrate', 'zdiff', 'zbig'])
  })

  it('AC16: skips defs with an empty summaryLabel', () => {
    const keys = summaryStats(defs(), { zempty: 5 }).map((s) => s.key)
    expect(keys).not.toContain('zempty')
  })

  it('AC16: returns nothing when no def has a summaryLabel or defs are empty', () => {
    expect(summaryStats([{ key: 'a', label: 'A', group: 'g' }], { a: 1 })).toEqual([])
    expect(summaryStats([], { a: 1 })).toEqual([])
  })

  it('AC17: formats one decimal when decimals is 1', () => {
    const r = summaryStats(defs(), { zrate: 27.25 })
    expect(r[0].text).toBe((27.25).toFixed(1))
    expect(summaryStats(defs(), { zrate: 30 })[0].text).toBe('30.0')
  })

  it('AC17: shows a leading + for a positive signed value', () => {
    expect(summaryStats(defs(), { zdiff: 11 })[1].text).toBe('+11')
  })

  it('AC17: shows no + for zero or negative signed values', () => {
    expect(summaryStats(defs(), { zdiff: 0 })[1].text).toBe('0')
    expect(summaryStats(defs(), { zdiff: -4 })[1].text).toBe('-4')
  })

  it('AC17: formats thousands with separators', () => {
    expect(summaryStats(defs(), { zbig: 5432 })[2].text).toBe('5,432')
  })

  it('AC17: shows an em dash for null values', () => {
    const r = summaryStats(defs(), { zrate: null, zdiff: null, zbig: null })
    expect(r.map((s) => s.text)).toEqual(['—', '—', '—'])
  })

  it('AC17: shows an em dash for missing keys and still lists the stat', () => {
    const r = summaryStats(defs(), { zrate: 2 })
    expect(r).toHaveLength(3)
    expect(r.map((s) => s.text)).toEqual(['2.0', '—', '—'])
  })

  it('AC17: shows an em dash for every stat when the stats map is empty', () => {
    expect(summaryStats(defs(), {}).map((s) => s.text)).toEqual(['—', '—', '—'])
  })

  it('does not mutate its inputs', () => {
    const d = defs()
    const s = { zrate: 1.5, zdiff: null }
    const dCopy = structuredClone(d)
    const sCopy = structuredClone(s)
    summaryStats(d, s)
    expect(d).toEqual(dCopy)
    expect(s).toEqual(sCopy)
  })
})

describe('findTeam and teamMetaLine immutability', () => {
  it('does not mutate the entities', () => {
    const teams = compareTeams()
    const copy = structuredClone(teams)
    const found = findTeam(teams, 'zt1')
    if (found) teamMetaLine(found, '3031')
    expect(teams).toEqual(copy)
  })
})

describe('teamModeHint', () => {
  it('AC3: compare mode hint uses MAX_SELECTED', () => {
    expect(teamModeHint('compare', MAX_SELECTED)).toBe('Compare up to 8 teams side by side')
  })

  it('AC3: the number comes from the max argument', () => {
    expect(teamModeHint('compare', 3)).toBe('Compare up to 3 teams side by side')
  })

  it('AC3: breakdown mode hint is fixed text', () => {
    expect(teamModeHint('inside', MAX_SELECTED)).toBe('Compare players within one team')
  })
})
