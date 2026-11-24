import { describe, expect, test } from 'vitest'
import { DEFAULT_CAMERA } from '../../lib/projection'
import { NULL_PLACEHOLDER } from '../../lib/stats'
import { CANONICAL_PLAYER_KEYS, compareStatDefs, comparePlayers } from '../../test/compareFixtures'
import {
  axesComplete,
  TAG_HEIGHT,
  axisDefs,
  axisLabelLayout,
  axisOptions,
  axisTicks,
  nearestPoint,
  placeTags,
  stepPoint,
  cameraForKey,
  chart3dModel,
  readoutModel,
} from './chart3dModel'

const defs = compareStatDefs().players
const keys3 = ['zhigh', 'zlow', 'zsign'] as const
const defs3 = axisDefs(keys3, defs)
const noMods = { shiftKey: false, ctrlKey: false, altKey: false, metaKey: false }
const key = (k: string, mods: Partial<typeof noMods> = {}) => ({ key: k, ...noMods, ...mods })

function numbersIn(value: unknown): number[] {
  if (typeof value === 'number') return [value]
  if (Array.isArray(value)) return value.flatMap(numbersIn)
  if (value && typeof value === 'object') return Object.values(value).flatMap(numbersIn)
  return []
}

function expectNoNaN(value: unknown) {
  expect(numbersIn(value).filter((n) => !Number.isFinite(n))).toEqual([])
}

describe('cameraForKey', () => {
  const cam = DEFAULT_CAMERA // yaw 0.65, pitch 0.38

  function setCam(action: ReturnType<typeof cameraForKey>) {
    expect(action).not.toBeNull()
    expect(action!.type).toBe('setCamera')
    return action as { type: 'setCamera'; yaw: number; pitch: number }
  }

  test('AC26: ArrowRight adds 0.1 to yaw and ArrowLeft subtracts 0.1', () => {
    const right = setCam(cameraForKey(key('ArrowRight'), cam))
    expect(right.yaw).toBeCloseTo(0.75, 10)
    expect(right.pitch).toBeCloseTo(0.38, 10)
    const left = setCam(cameraForKey(key('ArrowLeft'), cam))
    expect(left.yaw).toBeCloseTo(0.55, 10)
    expect(left.pitch).toBeCloseTo(0.38, 10)
  })

  test('AC26: ArrowDown adds 0.08 to pitch and ArrowUp subtracts 0.08', () => {
    const down = setCam(cameraForKey(key('ArrowDown'), cam))
    expect(down.pitch).toBeCloseTo(0.46, 10)
    expect(down.yaw).toBeCloseTo(0.65, 10)
    const up = setCam(cameraForKey(key('ArrowUp'), cam))
    expect(up.pitch).toBeCloseTo(0.3, 10)
    expect(up.yaw).toBeCloseTo(0.65, 10)
  })

  test('AC26: Shift makes every arrow step five times larger', () => {
    expect(setCam(cameraForKey(key('ArrowRight', { shiftKey: true }), cam)).yaw).toBeCloseTo(
      1.15,
      10,
    )
    expect(setCam(cameraForKey(key('ArrowLeft', { shiftKey: true }), cam)).yaw).toBeCloseTo(
      0.15,
      10,
    )
    expect(setCam(cameraForKey(key('ArrowDown', { shiftKey: true }), cam)).pitch).toBeCloseTo(
      0.78,
      10,
    )
    expect(setCam(cameraForKey(key('ArrowUp', { shiftKey: true }), cam)).pitch).toBeCloseTo(
      -0.02,
      10,
    )
  })

  test('AC26: pitch stays clamped to [-0.2, 1.3] at the upper boundary', () => {
    expect(setCam(cameraForKey(key('ArrowDown'), { yaw: 0, pitch: 1.3 })).pitch).toBeCloseTo(
      1.3,
      10,
    )
    expect(setCam(cameraForKey(key('ArrowDown'), { yaw: 0, pitch: 1.25 })).pitch).toBeCloseTo(
      1.3,
      10,
    )
    expect(
      setCam(cameraForKey(key('ArrowDown', { shiftKey: true }), { yaw: 0, pitch: 1.0 })).pitch,
    ).toBeCloseTo(1.3, 10)
  })

  test('AC26: pitch stays clamped to [-0.2, 1.3] at the lower boundary', () => {
    expect(setCam(cameraForKey(key('ArrowUp'), { yaw: 0, pitch: -0.2 })).pitch).toBeCloseTo(
      -0.2,
      10,
    )
    expect(setCam(cameraForKey(key('ArrowUp'), { yaw: 0, pitch: -0.15 })).pitch).toBeCloseTo(
      -0.2,
      10,
    )
    expect(
      setCam(cameraForKey(key('ArrowUp', { shiftKey: true }), { yaw: 0, pitch: 0 })).pitch,
    ).toBeCloseTo(-0.2, 10)
  })

  test('AC26: yaw is not clamped or wrapped', () => {
    expect(setCam(cameraForKey(key('ArrowRight'), { yaw: 100, pitch: 0.5 })).yaw).toBeCloseTo(
      100.1,
      8,
    )
  })

  test('AC26: Home returns a resetView action', () => {
    expect(cameraForKey(key('Home'), { yaw: 2, pitch: 1 })).toEqual({ type: 'resetView' })
  })

  test('AC27: Ctrl, Alt or Meta with an arrow or Home is not handled', () => {
    for (const mod of ['ctrlKey', 'altKey', 'metaKey'] as const) {
      expect(cameraForKey(key('ArrowRight', { [mod]: true }), cam)).toBeNull()
      expect(cameraForKey(key('ArrowDown', { [mod]: true }), cam)).toBeNull()
      expect(cameraForKey(key('Home', { [mod]: true }), cam)).toBeNull()
    }
  })

  test('AC27: Tab, Shift+Tab, Enter, Space, letters and other navigation keys return null', () => {
    for (const k of ['Tab', 'Enter', ' ', 'a', 'r', 'End', 'PageUp', 'Escape']) {
      expect(cameraForKey(key(k), cam)).toBeNull()
    }
    expect(cameraForKey(key('Tab', { shiftKey: true }), cam)).toBeNull()
  })

  test('AC27: the input camera is not mutated', () => {
    const frozen = Object.freeze({ yaw: 0.1, pitch: 0.2 })
    cameraForKey(key('ArrowRight'), frozen)
    expect(frozen).toEqual({ yaw: 0.1, pitch: 0.2 })
  })
})

describe('axisDefs and axesComplete', () => {
  test('AC6: axisDefs resolves each axis key to its definition in X, Y, Z order', () => {
    const found = axisDefs(['zsign', 'zhigh', 'zbig'], defs)
    expect(found.map((d) => d?.key)).toEqual(['zsign', 'zhigh', 'zbig'])
    expect(found[0]?.label).toBe('Zsign')
  })

  test('AC8: the same key on two axes resolves twice', () => {
    const found = axisDefs(['zhigh', 'zhigh', 'zlow'], defs)
    expect(found.map((d) => d?.key)).toEqual(['zhigh', 'zhigh', 'zlow'])
    expect(axesComplete(found)).toBe(true)
  })

  test('AC10: an unknown axis key resolves to undefined and the axes are incomplete', () => {
    const found = axisDefs(['zhigh', 'nope', 'zlow'], defs)
    expect(found[1]).toBeUndefined()
    expect(found[0]?.key).toBe('zhigh')
    expect(axesComplete(found)).toBe(false)
  })

  test('AC10: an empty definition list leaves every axis undefined', () => {
    const found = axisDefs(['zhigh', 'zlow', 'zbig'], [])
    expect(found.every((d) => d === undefined)).toBe(true)
    expect(axesComplete(found)).toBe(false)
  })

  test('AC10: axesComplete is true only when all three are defined', () => {
    expect(axesComplete(axisDefs(['zhigh', 'zlow', 'zbig'], defs))).toBe(true)
  })
})

describe('axisOptions', () => {
  test('AC6: lists every stat with its label in canonical order, not definition order', () => {
    // Definition order is zhigh, zbig, zlow, zsign, zsolo.
    const options = axisOptions(defs)
    expect(options.map((o) => o.value)).toEqual(CANONICAL_PLAYER_KEYS)
    expect(options.map((o) => o.label)).toEqual(['Zhigh', 'Zlow', 'Zbig', 'Zsign', 'Zsolo'])
  })

  test('AC6: an empty definition list gives no options', () => {
    expect(axisOptions([])).toEqual([])
  })
})

describe('readoutModel', () => {
  const players = comparePlayers()
  const byId = (id: string) => players.find((p) => p.id === id)!

  test('AC30: one card per column in selection order with the series colour index', () => {
    const cards = readoutModel(
      [
        { entity: byId('zp3'), colorIndex: 0 },
        { entity: byId('zp1'), colorIndex: 1 },
      ],
      keys3,
      defs3,
    )
    expect(cards.map((c) => c.entity.id)).toEqual(['zp3', 'zp1'])
    expect(cards.map((c) => c.colorIndex)).toEqual([0, 1])
  })

  test('AC30: no columns gives no cards', () => {
    expect(readoutModel([], keys3, defs3)).toEqual([])
  })

  test('AC31: each card has X, Y, Z cells with the stat label and formatted text', () => {
    // zp1: zhigh 10 (0 decimals), zlow 3.5 (2 decimals), zsign 2 (1 decimal, signed).
    const [card] = readoutModel([{ entity: byId('zp1'), colorIndex: 0 }], keys3, defs3)
    expect(card.cells).toEqual([
      { letter: 'X', label: 'Zhigh', text: '10', na: false },
      { letter: 'Y', label: 'Zlow', text: '3.50', na: false },
      { letter: 'Z', label: 'Zsign', text: '+2.0', na: false },
    ])
  })

  test('AC31: signed negative and zero values and thousands separators follow formatStat', () => {
    const k = ['zsign', 'zbig', 'zlow'] as const
    const d = axisDefs(k, defs)
    const [neg] = readoutModel([{ entity: byId('zp2'), colorIndex: 0 }], k, d)
    expect(neg.cells.map((c) => c.text)).toEqual(['-1.0', '1,200', '1.25'])
    const [zero] = readoutModel([{ entity: byId('zp3'), colorIndex: 0 }], k, d)
    expect(zero.cells.map((c) => c.text)).toEqual(['0.0', '1,000', '2.00'])
    const [big] = readoutModel([{ entity: byId('zp1'), colorIndex: 0 }], k, d)
    expect(big.cells[1].text).toBe('4,000')
  })

  test('AC32: a null value shows the placeholder and is flagged na', () => {
    const k = ['zsolo', 'zhigh', 'zlow'] as const
    const d = axisDefs(k, defs) // zp2 zsolo is null
    const [card] = readoutModel([{ entity: byId('zp2'), colorIndex: 0 }], k, d)
    expect(card.cells[0]).toEqual({ letter: 'X', label: 'Zsolo', text: NULL_PLACEHOLDER, na: true })
    expect(card.cells[1].na).toBe(false)
  })

  test('AC32: a missing value shows the placeholder and is flagged na', () => {
    const k = ['zhigh', 'zlow', 'zsolo'] as const
    const d = axisDefs(k, defs) // zp3 has no zsolo key at all
    const [card] = readoutModel([{ entity: byId('zp3'), colorIndex: 0 }], k, d)
    expect(card.cells[2]).toEqual({ letter: 'Z', label: 'Zsolo', text: NULL_PLACEHOLDER, na: true })
  })

  test('AC32: a selected entity with a null axis still gets a card', () => {
    const cards = readoutModel([{ entity: byId('zp4'), colorIndex: 2 }], keys3, defs3) // zhigh null
    expect(cards).toHaveLength(1)
    expect(cards[0].cells[0].text).toBe(NULL_PLACEHOLDER)
    expect(cards[0].cells[1].text).toBe('9.00')
  })

  test('AC10: an undefined definition gives the placeholder text and an empty label', () => {
    const k = ['zhigh', 'nope', 'zlow'] as const
    const d = axisDefs(k, defs)
    const [card] = readoutModel([{ entity: byId('zp1'), colorIndex: 0 }], k, d)
    expect(card.cells[1]).toEqual({ letter: 'Y', label: '', text: NULL_PLACEHOLDER, na: true })
    expect(card.cells[0].text).toBe('10')
    expect(card.cells[2].text).toBe('3.50')
  })

  test('AC8: the same stat on two axes gives two cells with the same value', () => {
    const k = ['zhigh', 'zhigh', 'zlow'] as const
    const d = axisDefs(k, defs)
    const [card] = readoutModel([{ entity: byId('zp1'), colorIndex: 0 }], k, d)
    expect(card.cells).toHaveLength(3)
    expect(card.cells[0]).toMatchObject({ letter: 'X', label: 'Zhigh', text: '10' })
    expect(card.cells[1]).toMatchObject({ letter: 'Y', label: 'Zhigh', text: '10' })
  })
})

describe('chart3dModel', () => {
  const pool = comparePlayers()
  const axes = ['zhigh', 'zlow', 'zbig'] as const
  const d3 = axisDefs(axes, defs)

  test('AC10: with a missing axis definition ok is false and the geometry is empty', () => {
    const m = chart3dModel(pool, axes, ['zp1'], DEFAULT_CAMERA, axisDefs(axes, []))
    expect(m.ok).toBe(false)
    expect(m.grid).toEqual([])
    expect(m.edges).toEqual([])
    expect(m.axes).toEqual([])
    expect(m.points).toEqual([])
    expect(m.tags).toEqual([])
  })

  test('AC13: a complete model has 30 grid lines, 12 cube edges and 3 axis lines', () => {
    const m = chart3dModel(pool, axes, ['zp1'], DEFAULT_CAMERA, d3)
    expect(m.ok).toBe(true)
    expect(m.grid).toHaveLength(30)
    expect(m.edges).toHaveLength(12)
    expect(m.axes).toHaveLength(3)
    expect(m.labels).toHaveLength(3)
  })

  test('AC3: an empty selection plots every eligible entity unselected with no tags', () => {
    const m = chart3dModel(pool, axes, [], DEFAULT_CAMERA, d3)
    // zp4 has a null zhigh and is not eligible.
    expect(m.points).toHaveLength(7)
    expect(m.points.map((p) => p.id)).not.toContain('zp4')
    expect(m.points.every((p) => p.selIndex === -1)).toBe(true)
    expect(m.tags).toEqual([])
  })

  test('AC15: unselected points come before selected points, each group back to front', () => {
    const m = chart3dModel(pool, axes, ['zp3', 'zp1', 'zp4'], DEFAULT_CAMERA, d3)
    expect(m.points).toHaveLength(8)
    const firstSelected = m.points.findIndex((p) => p.selIndex >= 0)
    expect(firstSelected).toBe(5)
    expect(m.points.slice(0, firstSelected).every((p) => p.selIndex === -1)).toBe(true)
    expect(m.points.slice(firstSelected).every((p) => p.selIndex >= 0)).toBe(true)
    for (const group of [m.points.slice(0, firstSelected), m.points.slice(firstSelected)]) {
      for (let i = 1; i < group.length; i++) {
        expect(group[i - 1].depth).toBeGreaterThanOrEqual(group[i].depth)
      }
    }
  })

  test('AC14: selIndex is the position in the selection list', () => {
    const m = chart3dModel(pool, axes, ['zp3', 'zp1'], DEFAULT_CAMERA, d3)
    expect(m.points.find((p) => p.id === 'zp3')?.selIndex).toBe(0)
    expect(m.points.find((p) => p.id === 'zp1')?.selIndex).toBe(1)
  })

  test('AC14: point coordinates follow the cube mapping (hand-computed for zp1)', () => {
    // zp1 is the league max on zhigh and zbig (cube 1) and zlow 3.5 of 1.25..9 maps to -0.4194.
    // Projected at yaw 0.65, pitch 0.38: x 456.6, y 250.6.
    const m = chart3dModel(pool, axes, ['zp1'], DEFAULT_CAMERA, d3)
    const p = m.points.find((q) => q.id === 'zp1')!
    expect(p.x).toBeCloseTo(456.6, 1)
    expect(p.y).toBeCloseTo(250.6, 1)
  })

  test('AC32: a selected entity with a null axis is plotted at -1 on that axis', () => {
    // zp4: zhigh null -> -1, zlow 9 (max) -> 1, zbig 2500 of 1000..4000 -> 0.
    // Projected at the default camera: x 208.4, y 82.3.
    const m = chart3dModel(pool, axes, ['zp4'], DEFAULT_CAMERA, d3)
    const p = m.points.find((q) => q.id === 'zp4')!
    expect(p.selIndex).toBe(0)
    expect(p.x).toBeCloseTo(208.4, 1)
    expect(p.y).toBeCloseTo(82.3, 1)
  })

  test('AC16: tags exist only for selected points and use the shortName', () => {
    const m = chart3dModel(pool, axes, ['zp1', 'zp4'], DEFAULT_CAMERA, d3)
    expect(m.tags).toHaveLength(2)
    const names = m.tags.map((t) => t.name).sort()
    expect(names).toEqual(['Quenby', 'Tolliver'])
    expect(m.tags.map((t) => t.name)).not.toContain('Ola Quenby')
  })

  test('AC16: a tag sits 10 units right of its point, as rounded percentages', () => {
    // zp1 point (456.6, 250.6): left (466.6 / 600) = 77.8%, top (250.6 / 460) = 54.5%.
    // zp4 point (208.4, 82.3): left (218.4 / 600) = 36.4%, top (82.3 / 460) = 17.9%.
    const m = chart3dModel(pool, axes, ['zp1', 'zp4'], DEFAULT_CAMERA, d3)
    const q1 = m.tags.find((t) => t.name === 'Quenby')!
    expect(q1.left).toBeCloseTo(77.8, 5)
    expect(q1.top).toBeCloseTo(54.5, 5)
    const q4 = m.tags.find((t) => t.name === 'Tolliver')!
    expect(q4.left).toBeCloseTo(36.4, 5)
    expect(q4.top).toBeCloseTo(17.9, 5)
  })

  test('AC16: a selected id that is not in the pool produces no point and no tag', () => {
    const m = chart3dModel(pool, axes, ['gone', 'zp1'], DEFAULT_CAMERA, d3)
    expect(m.points.map((p) => p.id)).not.toContain('gone')
    expect(m.tags.map((t) => t.name)).toEqual(['Quenby'])
  })

  test('AC2: the same stat on two axes still produces a complete model', () => {
    const same = ['zhigh', 'zhigh', 'zhigh'] as const
    const m = chart3dModel(pool, same, ['zp1'], DEFAULT_CAMERA, axisDefs(same, defs))
    expect(m.ok).toBe(true)
    expect(m.points.length).toBeGreaterThan(0)
    expectNoNaN(m)
  })

  test('AC32: no NaN appears when a stat is null for every entity', () => {
    const allNull = pool.map((e) => ({ ...e, stats: { ...e.stats, zsolo: null } }))
    const ax = ['zhigh', 'zlow', 'zsolo'] as const
    const m = chart3dModel(allNull, ax, ['zp1', 'zp2'], DEFAULT_CAMERA, axisDefs(ax, defs))
    expect(m.ok).toBe(true)
    // Nothing is eligible, so only the selected entities are plotted.
    expect(m.points.map((p) => p.id).sort()).toEqual(['zp1', 'zp2'])
    expectNoNaN(m)
  })

  test('AC32: no NaN appears when a stat is missing from every entity or the pool is empty', () => {
    const ax = ['zhigh', 'zlow', 'zsolo'] as const
    const stripped = pool.map((e) => ({ ...e, stats: { zhigh: 1, zlow: 2 } }))
    expectNoNaN(chart3dModel(stripped, ax, ['zp1'], DEFAULT_CAMERA, axisDefs(ax, defs)))
    const empty = chart3dModel([], axes, ['zp1'], DEFAULT_CAMERA, d3)
    expect(empty.points).toEqual([])
    expectNoNaN(empty)
  })

  test('AC10: no NaN appears for an incomplete model', () => {
    const k = ['zhigh', 'nope', 'zlow'] as const
    const m = chart3dModel(pool, k, ['zp1'], DEFAULT_CAMERA, axisDefs(k, defs))
    expect(m.ok).toBe(false)
    expectNoNaN(m)
  })

  test('AC38: the inputs are not mutated', () => {
    const frozenPool = Object.freeze(pool.map((e) => Object.freeze({ ...e })))
    const sel = Object.freeze(['zp1'])
    expect(chart3dModel(frozenPool, axes, sel, DEFAULT_CAMERA, d3).ok).toBe(true)
  })
})

describe('axisLabelLayout sides', () => {
  const label = (yaw: number, letter: string) =>
    axisLabelLayout({ yaw, pitch: 0.3 }, defs3).find((l) => l.letter === letter)!

  test('the y title near the left edge opens rightwards', () => {
    const y = label(0.65, 'Y')
    expect(y.left).toBeLessThan(40)
    expect(y.side).toBe('after')
  })

  test('x and z titles are centred and kept away from the card edges', () => {
    for (const yaw of [-2, -1, 0, 0.5, 1, 2.5]) {
      for (const letter of ['X', 'Z']) {
        const l = label(yaw, letter)
        expect(l.side).toBe('center')
        expect(l.left).toBeGreaterThanOrEqual(20)
        expect(l.left).toBeLessThanOrEqual(80)
      }
    }
  })

  test('a flat view hides the title of the axis that points at the viewer', () => {
    const front = axisLabelLayout({ yaw: 0, pitch: 0, flat: true }, defs3)
    expect(front.map((l) => l.hidden)).toEqual([false, false, true])
  })
})

describe('axisTicks', () => {
  const pool = comparePlayers()
  const axes = ['zhigh', 'zlow', 'zbig'] as const
  const d3 = axisDefs(axes, defs)

  test('numbers the league minimum, middle and maximum of every visible axis', () => {
    const ticks = axisTicks(pool, axes, DEFAULT_CAMERA, d3)
    expect(ticks.map((t) => t.key)).toEqual([
      'X-1',
      'X0',
      'X1',
      'Y-1',
      'Y0',
      'Y1',
      'Z-1',
      'Z0',
      'Z1',
    ])
    // zlow runs from 1.25 to 9 with two decimals.
    expect(ticks.slice(3, 6).map((t) => t.text)).toEqual(['1.25', '5.13', '9.00'])
  })

  test('leaves out the axis that points at the viewer', () => {
    const ticks = axisTicks(pool, axes, { yaw: 0, pitch: 0, flat: true }, d3)
    expect(ticks.map((t) => t.key[0])).toEqual(['X', 'X', 'X', 'Y', 'Y', 'Y'])
  })

  test('numbers only the middle when the league has a single value', () => {
    const one = [pool[0]]
    const ticks = axisTicks(one, axes, DEFAULT_CAMERA, d3)
    expect(ticks.map((t) => t.key)).toEqual(['X0', 'Y0', 'Z0'])
    expect(ticks[0].text).toBe('10')
  })
})

describe('picking and stepping through dots', () => {
  const pool = comparePlayers()
  const points = chart3dModel(
    pool,
    ['zhigh', 'zlow', 'zbig'],
    ['zp3', 'zp1'],
    DEFAULT_CAMERA,
    axisDefs(['zhigh', 'zlow', 'zbig'], defs),
  ).points

  test('picks the dot under the pointer and nothing when it is far away', () => {
    const target = points.find((p) => p.id === 'zp1')!
    expect(nearestPoint(points, target.x + 2, target.y - 2)).toBe('zp1')
    expect(nearestPoint(points, -500, -500)).toBeNull()
  })

  test('steps through selected dots first, in selection order, and wraps', () => {
    expect(stepPoint(pool, points, null, 1)).toBe('zp3')
    expect(stepPoint(pool, points, 'zp3', 1)).toBe('zp1')
    const last = stepPoint(pool, points, null, -1)
    expect(stepPoint(pool, points, last, 1)).toBe('zp3')
    expect(stepPoint(pool, [], null, 1)).toBeNull()
  })

  test('moves tags apart when two points are close together', () => {
    const close = [
      { ...points[0], id: 'a', x: 100, y: 100 },
      { ...points[0], id: 'b', x: 105, y: 104 },
      { ...points[0], id: 'c', x: 400, y: 100 },
    ]
    const places = placeTags(close)
    expect(places.get('a')).toEqual({ x: 100, y: 100 })
    expect(places.get('b')).toEqual({ x: 105, y: 100 + TAG_HEIGHT })
    expect(places.get('c')).toEqual({ x: 400, y: 100 })
  })
})
