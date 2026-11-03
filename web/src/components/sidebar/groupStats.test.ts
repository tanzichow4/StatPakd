import { describe, expect, it } from 'vitest'
import { fixtureSidebarStatDefs } from '../../test/fixtureProvider'
import { groupStats } from './groupStats'

const defs = () => fixtureSidebarStatDefs().players
const keys = (list: { key: string }[]) => list.map((d) => d.key)

describe('AC2: group order', () => {
  it('AC2: groups appear in first-appearance order even when extras are interleaved later', () => {
    expect(groupStats(defs(), []).map((g) => g.name)).toEqual([
      'zalpha',
      'zbeta',
      'zgamma',
      'zdelta',
    ])
  })
  it('AC2: teams groups keep first-appearance order', () => {
    const teams = fixtureSidebarStatDefs().teams
    expect(groupStats(teams, []).map((g) => g.name)).toEqual(['ztoff', 'ztdef'])
  })
})

describe('AC3: selected rows', () => {
  it('AC3: selected holds only selected defs, in definition order regardless of key order', () => {
    const groups = groupStats(defs(), ['zdrift', 'zblip', 'zscore'])
    expect(keys(groups[0].selected)).toEqual(['zscore', 'zblip', 'zdrift'])
  })
  it('AC3: selected defs are the original def objects (labels preserved)', () => {
    const groups = groupStats(defs(), ['zscore'])
    expect(groups[0].selected[0]).toMatchObject({ key: 'zscore', label: 'Zscore' })
  })
  it('AC3: the same keys in any order give the same result', () => {
    const a = groupStats(defs(), ['zkilt', 'zscore', 'zgrit'])
    const b = groupStats(defs(), ['zgrit', 'zkilt', 'zscore'])
    expect(a).toEqual(b)
  })
})

describe('AC4: empty group', () => {
  it('AC4: a group with nothing selected is present with empty selected', () => {
    const groups = groupStats(defs(), ['zscore'])
    const delta = groups.find((g) => g.name === 'zdelta')
    expect(delta?.selected).toEqual([])
    expect(keys(delta?.unselected ?? [])).toEqual(['zlorn'])
  })
  it('AC4: nothing selected at all still lists every group', () => {
    const groups = groupStats(defs(), [])
    expect(groups.map((g) => g.selected.length)).toEqual([0, 0, 0, 0])
  })
})

describe('AC10/AC11: unselected defs', () => {
  it('AC11: unselected includes extras in definition order', () => {
    const groups = groupStats(defs(), ['zscore', 'zgrit', 'zkilt'])
    expect(keys(groups[0].unselected)).toEqual(['zblip', 'zdrift'])
    expect(keys(groups[1].unselected)).toEqual(['zhum', 'zjolt'])
  })
  it('AC10: a fully selected group has empty unselected', () => {
    const groups = groupStats(defs(), ['zkilt'])
    expect(groups[2].unselected).toEqual([])
  })
  it('AC10: selecting everything leaves every unselected list empty', () => {
    const all = keys(defs())
    expect(groupStats(defs(), all).flatMap((g) => g.unselected)).toEqual([])
  })
  it('AC13: selected and unselected partition each group', () => {
    const groups = groupStats(defs(), ['zblip', 'zjolt'])
    const counts = groups.map((g) => g.selected.length + g.unselected.length)
    expect(counts).toEqual([3, 3, 1, 1])
  })
})

describe('AC7: unknown and invalid input', () => {
  it('AC7: a selected key with no def is ignored', () => {
    const groups = groupStats(defs(), ['zscore', 'znope'])
    expect(groups.flatMap((g) => keys(g.selected))).toEqual(['zscore'])
  })
  it('AC7: duplicate selected keys do not duplicate rows', () => {
    const groups = groupStats(defs(), ['zscore', 'zscore'])
    expect(keys(groups[0].selected)).toEqual(['zscore'])
  })
  it('AC7: empty defs give an empty list, even with selected keys', () => {
    expect(groupStats([], [])).toEqual([])
    expect(groupStats([], ['zscore'])).toEqual([])
  })
  it('AC7: does not mutate its inputs', () => {
    const d = Object.freeze(defs().map((x) => Object.freeze({ ...x })))
    const sel = Object.freeze(['zscore'])
    expect(groupStats(d, sel)).toHaveLength(4)
  })
})
