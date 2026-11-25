import { describe, expect, it } from 'vitest'
import type { Entity, StatDef } from '../../domain/types'
import { CANONICAL_PLAYER_KEYS, compareStatDefs, comparePlayers } from '../../test/compareFixtures'
import {
  COMPACT_HEADER_MIN,
  gridColumns,
  headerLines,
  resolveColumns,
  resolveRows,
  tableMinWidth,
} from './tableModel'

const players = comparePlayers()

describe('AC9: resolveColumns', () => {
  it('AC9: columns follow selection order, not entity order', () => {
    const cols = resolveColumns(['zp3', 'zp1', 'zp2'], players)
    expect(cols.map((c) => c.entity.id)).toEqual(['zp3', 'zp1', 'zp2'])
    expect(cols.map((c) => c.colorIndex)).toEqual([0, 1, 2])
  })
  it('AC9: an unknown id is skipped and the others keep their selection index', () => {
    const cols = resolveColumns(['zp1', 'zmissing', 'zp2'], players)
    expect(cols.map((c) => [c.entity.id, c.colorIndex])).toEqual([
      ['zp1', 0],
      ['zp2', 2],
    ])
  })
  it('AC9: an empty selection gives no columns', () => {
    expect(resolveColumns([], players)).toEqual([])
  })
  it('AC9: no loaded entities gives no columns', () => {
    expect(resolveColumns(['zp1', 'zp2'], [])).toEqual([])
  })
  it('AC9: all ids unknown gives no columns', () => {
    expect(resolveColumns(['a', 'b'], players)).toEqual([])
  })
  it('AC9: the entity objects are the loaded ones', () => {
    expect(resolveColumns(['zp2'], players)[0].entity).toBe(players[1])
  })
})

describe('AC10: resolveRows', () => {
  const defs = compareStatDefs().players
  it('AC10: rows come out in canonical order whatever the input order', () => {
    const rows = resolveRows(['zsolo', 'zsign', 'zbig', 'zlow', 'zhigh'], defs)
    expect(rows.map((r) => r.key)).toEqual(CANONICAL_PLAYER_KEYS)
  })
  it('AC10: only the requested keys are returned', () => {
    expect(resolveRows(['zbig', 'zhigh'], defs).map((r) => r.key)).toEqual(['zhigh', 'zbig'])
  })
  it('AC10: keys without a definition are dropped', () => {
    expect(resolveRows(['znope', 'zlow'], defs).map((r) => r.key)).toEqual(['zlow'])
  })
  it('AC10: returns the StatDef objects (labels available)', () => {
    expect(resolveRows(['zlow'], defs)[0]).toBe(defs[2])
  })
  it('AC10: no keys gives no rows', () => {
    expect(resolveRows([], defs)).toEqual([])
  })
  it('AC10: no definitions gives no rows', () => {
    expect(resolveRows(['zlow'], [])).toEqual([])
  })
  it('AC10: duplicates in the keys do not duplicate rows', () => {
    const unique = (rows: StatDef[]) => rows.map((r) => r.key)
    expect(unique(resolveRows(['zlow', 'zlow'], defs))).toEqual(['zlow'])
  })
})

describe('AC21: tableMinWidth and gridColumns', () => {
  it.each([
    [1, 320],
    [3, 580],
    [4, 710],
    [8, 1230],
  ])('AC21: tableMinWidth(%i) is %i', (n, width) => {
    expect(tableMinWidth(n)).toBe(width)
  })
  it('AC21: tableMinWidth(0) is the stat column only', () => {
    expect(tableMinWidth(0)).toBe(190)
  })
  it('AC21: gridColumns(3) is the exact template', () => {
    expect(gridColumns(3)).toBe('minmax(170px,1.3fr) repeat(3, minmax(0,1fr))')
  })
  it('AC21: gridColumns(8) uses the entity count', () => {
    expect(gridColumns(8)).toBe('minmax(170px,1.3fr) repeat(8, minmax(0,1fr))')
  })
})

describe('AC17: compact headers', () => {
  const e: Entity = {
    id: 'x',
    name: 'Full Name',
    shortName: 'Short',
    meta: 'the meta line',
    badge: 'BDG',
    stats: {},
  }
  it('AC17: the threshold is 5 entities', () => {
    expect(COMPACT_HEADER_MIN).toBe(5)
  })
  it('AC17: the full header is name and meta', () => {
    expect(headerLines(e, false)).toEqual({ title: 'Full Name', sub: 'the meta line' })
  })
  it('AC17: the compact header is shortName and badge', () => {
    expect(headerLines(e, true)).toEqual({ title: 'Short', sub: 'BDG' })
  })
})

describe('F2: headerLines drops a duplicated second line', () => {
  const entity = (over: Partial<Entity>): Entity => ({
    id: 'x',
    name: 'Full Name',
    shortName: 'Short',
    meta: 'the meta line',
    badge: 'BDG',
    stats: {},
    ...over,
  })
  it('F2: compact with shortName equal to badge gives one line', () => {
    const lines = headerLines(entity({ shortName: 'ZQA', badge: 'ZQA' }), true)
    expect(lines.title).toBe('ZQA')
    expect(lines.sub ?? '').toBe('')
  })
  it('F2: compact with different shortName and badge keeps two lines', () => {
    expect(headerLines(entity({ shortName: 'ZQA', badge: 'ZQB' }), true)).toEqual({
      title: 'ZQA',
      sub: 'ZQB',
    })
  })
  it('F2: non-compact keeps name and meta even when shortName equals badge', () => {
    expect(headerLines(entity({ shortName: 'ZQA', badge: 'ZQA' }), false)).toEqual({
      title: 'Full Name',
      sub: 'the meta line',
    })
  })
})
