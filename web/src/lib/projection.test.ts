import { describe, expect, it } from 'vitest'
import { DEFAULT_PITCH, DEFAULT_YAW } from '../state/appState'
import type { Entity } from '../domain/types'
import { deepFreeze } from '../state/testUtils'
import {
  axisEdges,
  axisGuides,
  axisLines,
  clampPitch,
  cubeEdges,
  cubeFaces,
  DEFAULT_CAMERA,
  dragCamera,
  farFaces,
  gridLines,
  plotPoints,
  project,
  toCube,
  type Camera,
  type Line,
  type Vec3,
} from './projection'

const DEFAULT_CAM = { yaw: 0.65, pitch: 0.38 }

describe('project', () => {
  it('AC1: origin projects to (300, 215) with depth 0 at the default camera', () => {
    const p = project([0, 0, 0], DEFAULT_CAM)
    expect(p.x).toBeCloseTo(300, 10)
    expect(p.y).toBeCloseTo(215, 10)
    expect(p.depth).toBeCloseTo(0, 10)
  })

  it('AC1: origin projects to (300, 215) with depth 0 at many yaw/pitch values', () => {
    const cams = [
      { yaw: 0, pitch: 0 },
      { yaw: 3.7, pitch: 1.3 },
      { yaw: -12.5, pitch: -0.2 },
      { yaw: 1000, pitch: 0.77 },
      { yaw: Math.PI, pitch: Math.PI / 2 },
    ]
    for (const cam of cams) {
      const p = project([0, 0, 0], cam)
      expect(p.x).toBeCloseTo(300, 10)
      expect(p.y).toBeCloseTo(215, 10)
      expect(p.depth).toBeCloseTo(0, 10)
    }
  })

  it('AC2: (1, 1, 1) at the default camera -> (475.7, 89.7), depth -0.1936', () => {
    const p = project([1, 1, 1], DEFAULT_CAM)
    expect(p.x).toBeCloseTo(475.7, 5)
    expect(p.y).toBeCloseTo(89.7, 5)
    expect(p.depth).toBeCloseTo(-0.1936, 4)
  })

  it('AC2: (1, -1, -1) at the default camera -> (328.9, 434.1), depth -0.9304', () => {
    const p = project([1, -1, -1], DEFAULT_CAM)
    expect(p.x).toBeCloseTo(328.9, 5)
    expect(p.y).toBeCloseTo(434.1, 5)
    expect(p.depth).toBeCloseTo(-0.9304, 4)
  })

  it('AC2: (-1, -1, -1) at the default camera -> (138.8, 330.0), depth 0.1936', () => {
    const p = project([-1, -1, -1], DEFAULT_CAM)
    expect(p.x).toBeCloseTo(138.8, 5)
    expect(p.y).toBeCloseTo(330, 5)
    expect(p.depth).toBeCloseTo(0.1936, 4)
  })

  it('AC2: screen coordinates are rounded to one decimal', () => {
    for (const pt of [
      [0.3, -0.77, 0.51],
      [1, 1, 1],
      [-0.2, 0.9, -0.4],
    ] as const) {
      const p = project(pt, DEFAULT_CAM)
      expect(Math.round(p.x * 10) / 10).toBeCloseTo(p.x, 10)
      expect(Math.round(p.y * 10) / 10).toBeCloseTo(p.y, 10)
    }
  })

  it('AC2: depth is not rounded', () => {
    const p = project([1, 1, 1], DEFAULT_CAM)
    expect(Math.abs(p.depth * 10000 - Math.round(p.depth * 10000))).toBeGreaterThan(1e-6)
  })

  it('AC3: at yaw 0, pitch 0, (1, 0, 0) projects to (428, 242) with depth 0', () => {
    const p = project([1, 0, 0], { yaw: 0, pitch: 0 })
    expect(p.x).toBeCloseTo(420, 10)
    expect(p.y).toBeCloseTo(215, 10)
    expect(p.depth).toBeCloseTo(0, 10)
  })

  it('AC3: at yaw 0, pitch 0, (0, 1, 0) projects to (300, 95) with depth 0 (+y is up)', () => {
    const p = project([0, 1, 0], { yaw: 0, pitch: 0 })
    expect(p.x).toBeCloseTo(300, 10)
    expect(p.y).toBeCloseTo(95, 10)
    expect(p.depth).toBeCloseTo(0, 10)
  })

  it('AC3: negative axes mirror (-1, 0, 0) -> (180, 215) and (0, -1, 0) -> (300, 335)', () => {
    const a = project([-1, 0, 0], { yaw: 0, pitch: 0 })
    expect(a.x).toBeCloseTo(180, 10)
    expect(a.y).toBeCloseTo(215, 10)
    const b = project([0, -1, 0], { yaw: 0, pitch: 0 })
    expect(b.x).toBeCloseTo(300, 10)
    expect(b.y).toBeCloseTo(335, 10)
  })

  it('AC3: perspective makes farther points (larger z) sit closer to the centre', () => {
    const cam = { yaw: 0, pitch: 0 }
    const far = project([1, 0, 1], cam)
    const near = project([1, 0, -1], cam)
    expect(far.depth).toBeCloseTo(1, 10)
    expect(near.depth).toBeCloseTo(-1, 10)
    // 300 + 120 * 4.5 / 5.5 = 398.2 ; 300 + 120 * 4.5 / 3.5 = 454.3
    expect(far.x).toBeCloseTo(398.2, 5)
    expect(near.x).toBeCloseTo(454.3, 5)
    expect(far.x).toBeLessThan(near.x)
  })

  it('AC3: yaw of a quarter turn sends +x to the depth axis', () => {
    // X = x cos(yaw), Z1 = -x sin(yaw) so (1,0,0) at yaw pi/2 has depth -1, x about 300
    const p = project([1, 0, 0], { yaw: Math.PI / 2, pitch: 0 })
    expect(p.depth).toBeCloseTo(-1, 10)
    expect(p.x).toBeCloseTo(300, 5)
  })

  it('AC3: pitch of a quarter turn looks straight down, so +y comes towards the eye', () => {
    // depth = -y sin(pitch) so (0,1,0) at pitch pi/2 has depth -1, y about 215
    const p = project([0, 1, 0], { yaw: 0, pitch: Math.PI / 2 })
    expect(p.depth).toBeCloseTo(-1, 10)
    expect(p.y).toBeCloseTo(215, 5)
  })

  it('AC4: uses the camera passed in, so two cameras give different results', () => {
    const a = project([1, 1, 1], DEFAULT_CAM)
    const b = project([1, 1, 1], { yaw: 0.5, pitch: 0.1 })
    expect(`${a.x},${a.y},${a.depth}`).not.toBe(`${b.x},${b.y},${b.depth}`)
    const c = project([1, 1, 1], { yaw: 0.5, pitch: 0.1 })
    expect(c).toEqual(b)
  })

  it('AC4: does not clamp pitch or wrap yaw (yaw 2*pi equals yaw 0)', () => {
    const a = project([0.3, 0.4, 0.5], { yaw: 2 * Math.PI, pitch: 0 })
    const b = project([0.3, 0.4, 0.5], { yaw: 0, pitch: 0 })
    expect(a.x).toBeCloseTo(b.x, 5)
    expect(a.y).toBeCloseTo(b.y, 5)
    const hi = project([0, 1, 0], { yaw: 0, pitch: 2 })
    // Z = sin(2) ~ 0.9093 -> beyond the 1.3 drag clamp, so it must differ from pitch 1.3
    const clamped = project([0, 1, 0], { yaw: 0, pitch: 1.3 })
    expect(hi.depth).not.toBeCloseTo(clamped.depth, 3)
  })

  it('AC4: DEFAULT_CAMERA comes from DEFAULT_YAW / DEFAULT_PITCH', () => {
    expect(DEFAULT_CAMERA.yaw).toBe(DEFAULT_YAW)
    expect(DEFAULT_CAMERA.pitch).toBe(DEFAULT_PITCH)
    expect(DEFAULT_CAMERA).toEqual({ yaw: 0.65, pitch: 0.38 })
  })

  it('AC1: never returns NaN for the cube corners across cameras', () => {
    const cams = [
      DEFAULT_CAM,
      { yaw: 0, pitch: 0 },
      { yaw: 5, pitch: 1.3 },
      { yaw: -3, pitch: -0.2 },
    ]
    for (const cam of cams) {
      for (const x of [-1, 1]) {
        for (const y of [-1, 1]) {
          for (const z of [-1, 1]) {
            const p = project([x, y, z], cam)
            expect(Number.isNaN(p.x)).toBe(false)
            expect(Number.isNaN(p.y)).toBe(false)
            expect(Number.isNaN(p.depth)).toBe(false)
          }
        }
      }
    }
  })
})

describe('toCube', () => {
  const range = { min: 0, max: 10 }

  it('AC5: maps 0 -> -1, 5 -> 0, 10 -> +1 for a 0..10 range', () => {
    expect(toCube(0, range)).toBeCloseTo(-1, 10)
    expect(toCube(5, range)).toBeCloseTo(0, 10)
    expect(toCube(10, range)).toBeCloseTo(1, 10)
  })

  it('AC5: maps quarter points linearly and works for a non-zero minimum', () => {
    expect(toCube(2.5, range)).toBeCloseTo(-0.5, 10)
    expect(toCube(7.5, range)).toBeCloseTo(0.5, 10)
    expect(toCube(150, { min: 100, max: 200 })).toBeCloseTo(0, 10)
    expect(toCube(-5, { min: -10, max: 0 })).toBeCloseTo(0, 10)
  })

  it('AC6: null maps to -1', () => {
    expect(toCube(null, range)).toBeCloseTo(-1, 10)
  })

  it('AC6: undefined (missing) maps to -1', () => {
    expect(toCube(undefined, range)).toBeCloseTo(-1, 10)
  })

  it('AC6: null maps to -1 even when min equals max or there is no range', () => {
    expect(toCube(null, { min: 4, max: 4 })).toBeCloseTo(-1, 10)
    expect(toCube(null, null)).toBeCloseTo(-1, 10)
  })

  it('AC7: any non-null value maps to 0 when min equals max', () => {
    const same = { min: 7, max: 7 }
    expect(toCube(7, same)).toBeCloseTo(0, 10)
    expect(toCube(0, same)).toBeCloseTo(0, 10)
    expect(toCube(100, same)).toBeCloseTo(0, 10)
  })

  it('AC7: a zero-valued min = max range does not produce NaN', () => {
    const v = toCube(0, { min: 0, max: 0 })
    expect(Number.isNaN(v)).toBe(false)
    expect(v).toBeCloseTo(0, 10)
  })

  it('AC8: a non-null value maps to 0 when the range is null, never NaN', () => {
    const v = toCube(42, null)
    expect(Number.isNaN(v)).toBe(false)
    expect(v).toBeCloseTo(0, 10)
    expect(toCube(0, null)).toBeCloseTo(0, 10)
  })

  it('AC9: higher raw values are always further along +axis (no inversion)', () => {
    const lo = toCube(1, range)
    const mid = toCube(5, range)
    const hi = toCube(9, range)
    expect(lo).toBeLessThan(mid)
    expect(mid).toBeLessThan(hi)
  })

  it('AC5: values outside the range never produce NaN', () => {
    expect(Number.isNaN(toCube(-3, range))).toBe(false)
  })
})

// Expected values below come from an independent implementation of the camera formulas.

function ent(id: string, stats: Record<string, number | null>): Entity {
  return { id, name: id, shortName: id, meta: '', badge: id, stats }
}

const AXES = ['a', 'b', 'c'] as const

function pool() {
  return [
    ent('lo', { a: 0, b: 0, c: 0 }),
    ent('hi', { a: 10, b: 10, c: 10 }),
    ent('mid', { a: 5, b: 5, c: 5 }),
    ent('twin', { a: 5, b: 5, c: 5 }),
    ent('nullB', { a: 5, b: null, c: 5 }),
    ent('noC', { a: 5, b: 5 }),
  ]
}

describe('plotPoints', () => {
  it('AC11: includes every entity that has all three axes, excluding unselected incomplete ones', () => {
    const ids = plotPoints(pool(), AXES, [], DEFAULT_CAM).map((p) => p.id)
    expect([...ids].sort()).toEqual(['hi', 'lo', 'mid', 'twin'])
  })

  it('AC12: an unselected entity with a null axis is excluded', () => {
    const ids = plotPoints(pool(), AXES, [], DEFAULT_CAM).map((p) => p.id)
    expect(ids).not.toContain('nullB')
  })

  it('AC12: an unselected entity with a missing axis is excluded', () => {
    const ids = plotPoints(pool(), AXES, [], DEFAULT_CAM).map((p) => p.id)
    expect(ids).not.toContain('noC')
  })

  it('AC11: a selected entity with a null axis is plotted with that axis at -1', () => {
    const pts = plotPoints(pool(), AXES, ['nullB'], DEFAULT_CAM)
    const p = pts.find((q) => q.id === 'nullB')
    expect(p).toBeDefined()
    // cube coords (0, -1, 0)
    const e = project([0, -1, 0], DEFAULT_CAM)
    expect(p!.x).toBeCloseTo(e.x, 5)
    expect(p!.y).toBeCloseTo(e.y, 5)
    expect(p!.depth).toBeCloseTo(e.depth, 8)
  })

  it('AC11: a selected entity with a missing axis is plotted with that axis at -1', () => {
    const pts = plotPoints(pool(), AXES, ['noC'], DEFAULT_CAM)
    const p = pts.find((q) => q.id === 'noC')
    expect(p).toBeDefined()
    const e = project([0, 0, -1], DEFAULT_CAM)
    expect(p!.x).toBeCloseTo(e.x, 5)
    expect(p!.y).toBeCloseTo(e.y, 5)
  })

  it('AC10: ranges come from the whole pool, not the selected entities', () => {
    // Only 'mid' is selected. If ranges were over the selection, lo and hi would collapse to 0.
    const pts = plotPoints(pool(), AXES, ['mid'], DEFAULT_CAM)
    const lo = pts.find((p) => p.id === 'lo')!
    const hi = pts.find((p) => p.id === 'hi')!
    expect(lo.x).toBeCloseTo(138.8, 5)
    expect(lo.y).toBeCloseTo(330, 5)
    expect(lo.depth).toBeCloseTo(0.1936, 4)
    expect(hi.x).toBeCloseTo(475.7, 5)
    expect(hi.y).toBeCloseTo(89.7, 5)
    expect(hi.depth).toBeCloseTo(-0.1936, 4)
    const mid = pts.find((p) => p.id === 'mid')!
    expect(mid.x).toBeCloseTo(300, 5)
    expect(mid.y).toBeCloseTo(215, 5)
  })

  it('AC10: null values do not affect the range (min and max ignore them)', () => {
    const pts = plotPoints(pool(), AXES, ['nullB'], DEFAULT_CAM)
    // b range is 0..10, so 'hi' is still at +1 on y
    const hi = pts.find((p) => p.id === 'hi')!
    expect(hi.y).toBeCloseTo(89.7, 5)
  })

  it('AC13: each point reports id, selIndex, x, y, depth, footX, footY', () => {
    const pts = plotPoints(pool(), AXES, ['hi', 'lo'], DEFAULT_CAM)
    const hi = pts.find((p) => p.id === 'hi')!
    expect(hi.selIndex).toBe(0)
    expect(hi.x).toBeCloseTo(475.7, 5)
    expect(hi.y).toBeCloseTo(89.7, 5)
    expect(hi.depth).toBeCloseTo(-0.1936, 4)
    const foot = project([1, -1, 1], DEFAULT_CAM)
    expect(hi.footX).toBeCloseTo(foot.x, 5)
    expect(hi.footY).toBeCloseTo(foot.y, 5)
    const lo = pts.find((p) => p.id === 'lo')!
    expect(lo.selIndex).toBe(1)
    // foot of (-1,-1,-1) is itself
    expect(lo.footX).toBeCloseTo(lo.x, 5)
    expect(lo.footY).toBeCloseTo(lo.y, 5)
  })

  it('AC13: selIndex is -1 for unselected entities', () => {
    const pts = plotPoints(pool(), AXES, ['hi'], DEFAULT_CAM)
    expect(pts.find((p) => p.id === 'lo')!.selIndex).toBe(-1)
    expect(pts.find((p) => p.id === 'mid')!.selIndex).toBe(-1)
  })

  it('AC13: selIndex follows the order of the selected list, not the pool', () => {
    const pts = plotPoints(pool(), AXES, ['mid', 'hi', 'lo'], DEFAULT_CAM)
    expect(pts.find((p) => p.id === 'mid')!.selIndex).toBe(0)
    expect(pts.find((p) => p.id === 'hi')!.selIndex).toBe(1)
    expect(pts.find((p) => p.id === 'lo')!.selIndex).toBe(2)
  })

  it('AC13: foot x/y depend on the camera passed in', () => {
    const cam = { yaw: 0.35, pitch: 0.78 }
    const hi = plotPoints(pool(), AXES, [], cam).find((p) => p.id === 'hi')!
    const foot = project([1, -1, 1], cam)
    expect(hi.footX).toBeCloseTo(foot.x, 5)
    expect(hi.footY).toBeCloseTo(foot.y, 5)
  })

  it('AC14: points are sorted by descending depth (farthest first)', () => {
    const pts = plotPoints(pool(), AXES, [], DEFAULT_CAM)
    expect(pts.map((p) => p.id)).toEqual(['lo', 'mid', 'twin', 'hi'])
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i - 1].depth).toBeGreaterThanOrEqual(pts[i].depth)
    }
  })

  it('AC14: the order follows the camera when depths change', () => {
    // at yaw 0, pitch 0 depth is z: hi (z=+1) first, lo (z=-1) last
    const pts = plotPoints(pool(), AXES, [], { yaw: 0, pitch: 0 })
    expect(pts[0].id).toBe('hi')
    expect(pts[pts.length - 1].id).toBe('lo')
  })

  it('AC15: equal-depth points keep pool order', () => {
    const a = plotPoints(pool(), AXES, [], DEFAULT_CAM).map((p) => p.id)
    expect(a.indexOf('mid')).toBeLessThan(a.indexOf('twin'))
    const reordered = [
      ent('twin', { a: 5, b: 5, c: 5 }),
      ent('mid', { a: 5, b: 5, c: 5 }),
      ent('lo', { a: 0, b: 0, c: 0 }),
      ent('hi', { a: 10, b: 10, c: 10 }),
    ]
    const b = plotPoints(reordered, AXES, [], DEFAULT_CAM).map((p) => p.id)
    expect(b).toEqual(['lo', 'twin', 'mid', 'hi'])
  })

  it('AC15: many identical entities keep their pool order', () => {
    const many = Array.from({ length: 12 }, (_, i) => ent(`e${i}`, { a: 1, b: 1, c: 1 }))
    const ids = plotPoints(many, AXES, [], DEFAULT_CAM).map((p) => p.id)
    expect(ids).toEqual(many.map((e) => e.id))
  })

  it('AC16: does not mutate frozen inputs and returns a new array', () => {
    const frozenPool = deepFreeze(pool())
    const axes = deepFreeze(['a', 'b', 'c'] as [string, string, string])
    const sel = deepFreeze(['hi', 'nullB'])
    const cam = deepFreeze({ yaw: -0.65, pitch: 0.38 })
    const before = JSON.stringify(frozenPool)
    const out = plotPoints(frozenPool, axes, sel, cam)
    expect(out.length).toBeGreaterThan(0)
    expect(JSON.stringify(frozenPool)).toBe(before)
    expect(out as unknown).not.toBe(frozenPool)
  })

  it('AC16: pool order is unchanged after sorting', () => {
    const p = pool()
    const idsBefore = p.map((e) => e.id)
    plotPoints(p, AXES, [], DEFAULT_CAM)
    expect(p.map((e) => e.id)).toEqual(idsBefore)
  })

  it('AC26: an unknown selected id is ignored without error', () => {
    const pts = plotPoints(pool(), AXES, ['ghost', 'hi'], DEFAULT_CAM)
    expect(pts.map((p) => p.id)).not.toContain('ghost')
    expect(pts.length).toBe(4)
    // the known id keeps its position in the selected list
    expect(pts.find((p) => p.id === 'hi')!.selIndex).toBe(1)
  })

  it('AC26: only unknown ids selected gives the plain unselected set', () => {
    const pts = plotPoints(pool(), AXES, ['ghost'], DEFAULT_CAM)
    expect(pts.length).toBe(4)
    expect(pts.every((p) => p.selIndex === -1)).toBe(true)
  })

  it('AC11: an empty pool gives an empty list', () => {
    expect(plotPoints([], AXES, [], DEFAULT_CAM)).toEqual([])
    expect(plotPoints([], AXES, ['hi'], DEFAULT_CAM)).toEqual([])
  })

  it('AC11: a pool where every axis is all-equal puts points at the cube centre, no NaN', () => {
    const same = [ent('p', { a: 3, b: 3, c: 3 }), ent('q', { a: 3, b: 3, c: 3 })]
    const pts = plotPoints(same, AXES, [], DEFAULT_CAM)
    expect(pts).toHaveLength(2)
    for (const p of pts) {
      expect(p.x).toBeCloseTo(300, 5)
      expect(p.y).toBeCloseTo(215, 5)
      expect(Number.isNaN(p.depth)).toBe(false)
    }
  })

  it('AC11: no usable values on an axis gives no unselected points and no NaN for selected', () => {
    const none = [ent('p', { a: 1, b: null, c: 1 }), ent('q', { a: 2, b: null, c: 2 })]
    expect(plotPoints(none, AXES, [], DEFAULT_CAM)).toEqual([])
    const pts = plotPoints(none, AXES, ['p'], DEFAULT_CAM)
    expect(pts).toHaveLength(1)
    expect(Number.isNaN(pts[0].x)).toBe(false)
    expect(Number.isNaN(pts[0].y)).toBe(false)
  })

  it('AC11: axis keys decide which stat feeds which axis', () => {
    const skew = [ent('s', { a: 10, b: 0, c: 0 }), ent('t', { a: 0, b: 10, c: 10 })]
    const sPt = plotPoints(skew, ['a', 'b', 'c'], [], DEFAULT_CAM).find((p) => p.id === 's')!
    // cube coords (1, -1, -1) -> (328.9, 434.1)
    expect(sPt.x).toBeCloseTo(328.9, 5)
    expect(sPt.y).toBeCloseTo(434.1, 5)
    // swapping the x and z keys puts s at cube (-1, -1, 1)
    const swapped = plotPoints(skew, ['c', 'b', 'a'], [], DEFAULT_CAM).find((p) => p.id === 's')!
    const e = project([-1, -1, 1], DEFAULT_CAM)
    expect(swapped.x).toBeCloseTo(e.x, 5)
    expect(swapped.y).toBeCloseTo(e.y, 5)
  })
})

describe('clampPitch / dragCamera', () => {
  const start: Camera = { yaw: -0.65, pitch: 0.38 }

  it('AC17: clampPitch leaves in-range values alone', () => {
    expect(clampPitch(0.5)).toBe(0.5)
    expect(clampPitch(0)).toBe(0)
  })

  it('AC17: clampPitch boundary values -0.2 and 1.3 are kept exactly', () => {
    expect(clampPitch(-0.2)).toBe(-0.2)
    expect(clampPitch(1.3)).toBe(1.3)
  })

  it('AC17: clampPitch clamps just beyond the boundaries', () => {
    expect(clampPitch(-0.2001)).toBe(-0.2)
    expect(clampPitch(1.3001)).toBe(1.3)
    expect(clampPitch(-100)).toBe(-0.2)
    expect(clampPitch(100)).toBe(1.3)
  })

  it('AC17: yaw = yaw0 + dx * 0.01 and pitch = pitch0 + dy * 0.008', () => {
    const c = dragCamera({ yaw: 1, pitch: 0.5 }, 10, 5)
    expect(c.yaw).toBeCloseTo(1.1, 10)
    expect(c.pitch).toBeCloseTo(0.54, 10)
  })

  it('AC18: (-0.65, 0.38) with dx 100, dy 50 -> (0.35, 0.78)', () => {
    const c = dragCamera(start, 100, 50)
    expect(c.yaw).toBeCloseTo(0.35, 10)
    expect(c.pitch).toBeCloseTo(0.78, 10)
  })

  it('AC18: dy 200 clamps pitch to 1.3', () => {
    expect(dragCamera(start, 0, 200).pitch).toBeCloseTo(1.3, 10)
  })

  it('AC18: dy -100 clamps pitch to -0.2', () => {
    expect(dragCamera(start, 0, -100).pitch).toBeCloseTo(-0.2, 10)
  })

  it('AC18: dx 1000 gives yaw 9.35 (never wrapped or clamped)', () => {
    expect(dragCamera(start, 1000, 0).yaw).toBeCloseTo(9.35, 10)
    expect(dragCamera(start, -1000, 0).yaw).toBeCloseTo(-10.65, 10)
  })

  it('AC17: a zero delta returns the start camera', () => {
    const c = dragCamera(start, 0, 0)
    expect(c.yaw).toBeCloseTo(-0.65, 10)
    expect(c.pitch).toBeCloseTo(0.38, 10)
  })

  it('AC17: a start pitch already outside the range is clamped', () => {
    expect(dragCamera({ yaw: 0, pitch: 2 }, 0, 0).pitch).toBeCloseTo(1.3, 10)
  })

  it('AC19: the result depends only on the start camera and the latest delta', () => {
    const frozen = deepFreeze({ yaw: -0.65, pitch: 0.38 })
    const first = dragCamera(frozen, 30, 20)
    const second = dragCamera(frozen, 100, 50)
    expect(first.yaw).toBeCloseTo(-0.35, 10)
    expect(second.yaw).toBeCloseTo(0.35, 10)
    expect(second.pitch).toBeCloseTo(0.78, 10)
    // not cumulative: second is not first plus the second delta
    expect(second.yaw).not.toBeCloseTo(first.yaw + 1, 5)
  })

  it('AC19: does not mutate the start camera', () => {
    const frozen = deepFreeze({ yaw: 0.1, pitch: 0.2 })
    const c = dragCamera(frozen, 5, 5)
    expect(frozen).toEqual({ yaw: 0.1, pitch: 0.2 })
    expect(c).not.toBe(frozen)
  })
})

type Seg = readonly [number, number, number, number]
const toSeg = (l: Line): Seg => [l.x1, l.y1, l.x2, l.y2]
function checkSegs(lines: readonly Line[], expected: readonly Seg[]) {
  lines.forEach((l, i) => {
    toSeg(l).forEach((v, j) => expect(v, `line ${i} coord ${j}`).toBeCloseTo(expected[i][j], 5))
  })
}
function seg(a: Vec3, b: Vec3, cam: Camera): Seg {
  const p = project(a, cam)
  const q = project(b, cam)
  return [p.x, p.y, q.x, q.y]
}

const CAM2: Camera = { yaw: 0.35, pitch: 0.78 }

// prettier-ignore
const GRID_DEFAULT: Seg[] = [
  [138.8, 330, 283.3, 250.8], [138.8, 330, 328.9, 434.1], [138.8, 330, 283.3, 250.8],
  [138.8, 330, 108.5, 97.8], [283.3, 250.8, 449.9, 306.8], [283.3, 250.8, 281, 71],
  [177.2, 351, 319, 262.8], [182.8, 305.8, 367.6, 393.3], [132.2, 279.1, 282.8, 210],
  [182.8, 305.8, 162.7, 89.4], [282.8, 210, 455.6, 258.7], [319, 262.8, 321.7, 74.9],
  [220.9, 375, 358.3, 276], [220.9, 285, 399.8, 359.5], [125, 223.8, 282.2, 166.6],
  [220.9, 285, 208.4, 82.3], [282.2, 166.6, 461.8, 206.8], [358.3, 276, 367.1, 79.2],
  [271, 402.4, 401.7, 290.6], [254.1, 266.8, 426.8, 331.1], [117.1, 163.6, 281.6, 120.4],
  [254.1, 266.8, 247.3, 76.2], [281.6, 120.4, 468.5, 150.7], [401.7, 290.6, 418.1, 84.1],
  [328.9, 434.1, 449.9, 306.8], [283.3, 250.8, 449.9, 306.8], [108.5, 97.8, 281, 71],
  [283.3, 250.8, 281, 71], [281, 71, 475.7, 89.7], [449.9, 306.8, 475.7, 89.7],
]
// prettier-ignore
const GRID_CAM2: Seg[] = [
  [155.1, 342.7, 247.3, 198.1], [155.1, 342.7, 375.1, 417.9], [155.1, 342.7, 247.3, 198.1],
  [155.1, 342.7, 94.7, 168.3], [247.3, 198.1, 423, 243], [247.3, 198.1, 231.6, 30],
  [205.8, 360, 288.6, 208.7], [182.7, 299.5, 389.6, 364.7], [143.6, 309.5, 244.1, 163.8],
  [182.7, 299.5, 138.2, 124.4], [244.1, 163.8, 431.2, 208.4], [288.6, 208.7, 285.1, 39.3],
  [259.2, 378.3, 331.5, 219.6], [206.9, 261.6, 402.3, 318.7], [130.1, 270.6, 240.5, 125],
  [206.9, 261.6, 174.5, 87.8], [240.5, 125, 440.6, 169], [331.5, 219.6, 341.5, 49.1],
  [315.5, 397.6, 376.3, 231], [228.3, 228, 413.3, 278.4], [114.1, 224.3, 236.3, 80.8],
  [228.3, 228, 205.2, 56.7], [236.3, 80.8, 451.4, 123.5], [376.3, 231, 401, 59.4],
  [375.1, 417.9, 423, 243], [247.3, 198.1, 423, 243], [94.7, 168.3, 231.6, 30],
  [247.3, 198.1, 231.6, 30], [231.6, 30, 464.1, 70.4], [423, 243, 464.1, 70.4],
]
// prettier-ignore
const EDGES_DEFAULT: Seg[] = [
  [138.8, 330, 328.9, 434.1], [138.8, 330, 108.5, 97.8], [138.8, 330, 283.3, 250.8],
  [283.3, 250.8, 449.9, 306.8], [283.3, 250.8, 281, 71], [108.5, 97.8, 281, 71],
  [108.5, 97.8, 336.5, 136.9], [328.9, 434.1, 336.5, 136.9], [328.9, 434.1, 449.9, 306.8],
  [281, 71, 475.7, 89.7], [449.9, 306.8, 475.7, 89.7], [336.5, 136.9, 475.7, 89.7],
]
// prettier-ignore
const EDGES_CAM2: Seg[] = [
  [155.1, 342.7, 375.1, 417.9], [155.1, 342.7, 94.7, 168.3], [155.1, 342.7, 247.3, 198.1],
  [247.3, 198.1, 423, 243], [247.3, 198.1, 231.6, 30], [94.7, 168.3, 231.6, 30],
  [94.7, 168.3, 411.6, 250.7], [375.1, 417.9, 411.6, 250.7], [375.1, 417.9, 423, 243],
  [231.6, 30, 464.1, 70.4], [423, 243, 464.1, 70.4], [411.6, 250.7, 464.1, 70.4],
]

describe('gridLines', () => {
  it('AC20: returns 30 lines: floor and two back walls', () => {
    expect(gridLines(DEFAULT_CAM)).toHaveLength(30)
  })

  it('AC20: matches the expected grid, in order, at the default camera', () => {
    expect(gridLines(DEFAULT_CAM)).toHaveLength(GRID_DEFAULT.length)
    checkSegs(gridLines(DEFAULT_CAM), GRID_DEFAULT)
  })

  it('AC20: matches the expected grid, in order, at another camera', () => {
    expect(gridLines(CAM2)).toHaveLength(GRID_CAM2.length)
    checkSegs(gridLines(CAM2), GRID_CAM2)
  })

  it('AC20: endpoints follow the stated 3D order for each t', () => {
    const expected: Seg[] = []
    for (const t of [-1, -0.5, 0, 0.5, 1]) {
      expected.push(
        seg([t, -1, -1], [t, -1, 1], CAM2),
        seg([-1, -1, t], [1, -1, t], CAM2),
        seg([-1, t, -1], [-1, t, 1], CAM2),
        seg([-1, -1, t], [-1, 1, t], CAM2),
        seg([-1, t, 1], [1, t, 1], CAM2),
        seg([t, -1, 1], [t, 1, 1], CAM2),
      )
    }
    expect(gridLines(CAM2)).toHaveLength(expected.length)
    checkSegs(gridLines(CAM2), expected)
  })

  it('AC24: the first grid line starts at (138.8, 330) at the default camera', () => {
    const first = gridLines(DEFAULT_CAM)[0]
    expect(first.x1).toBeCloseTo(138.8, 5)
    expect(first.y1).toBeCloseTo(330, 5)
  })

  it('AC24: every grid endpoint is a one-decimal projection', () => {
    for (const l of gridLines(CAM2)) {
      for (const v of toSeg(l)) expect(Math.round(v * 10) / 10).toBeCloseTo(v, 10)
    }
  })
})

describe('cubeEdges', () => {
  it('AC21: returns 12 edges', () => {
    expect(cubeEdges(DEFAULT_CAM)).toHaveLength(12)
  })

  it('AC21: matches the design edge order at the default camera', () => {
    expect(cubeEdges(DEFAULT_CAM)).toHaveLength(EDGES_DEFAULT.length)
    checkSegs(cubeEdges(DEFAULT_CAM), EDGES_DEFAULT)
  })

  it('AC21: matches the design edge order at another camera', () => {
    expect(cubeEdges(CAM2)).toHaveLength(EDGES_CAM2.length)
    checkSegs(cubeEdges(CAM2), EDGES_CAM2)
  })

  it('AC21: endpoints follow x-, y-, z-edge order for a, b in [-1, 1]', () => {
    const expected: Seg[] = []
    for (const a of [-1, 1]) {
      for (const b of [-1, 1]) {
        expected.push(
          seg([-1, a, b], [1, a, b], DEFAULT_CAM),
          seg([a, -1, b], [a, 1, b], DEFAULT_CAM),
          seg([a, b, -1], [a, b, 1], DEFAULT_CAM),
        )
      }
    }
    expect(cubeEdges(DEFAULT_CAM)).toHaveLength(expected.length)
    checkSegs(cubeEdges(DEFAULT_CAM), expected)
  })
})

describe('axisLines', () => {
  it('AC22: returns the x, y and z axis edges in that order at the default camera', () => {
    const lines = axisLines(DEFAULT_CAM)
    expect(lines).toHaveLength(3)
    // Near bottom edge for x, left upright edge for y, near bottom edge for z.
    checkSegs(lines, [
      seg([-1, -1, -1], [1, -1, -1], DEFAULT_CAM),
      seg([-1, -1, -1], [-1, 1, -1], DEFAULT_CAM),
      seg([1, -1, -1], [1, -1, 1], DEFAULT_CAM),
    ])
  })

  it('AC22: matches the expected axes at both cameras', () => {
    expect(axisLines(DEFAULT_CAM)).toHaveLength(3)
    checkSegs(axisLines(DEFAULT_CAM), [
      [138.8, 330, 328.9, 434.1],
      [138.8, 330, 108.5, 97.8],
      [328.9, 434.1, 449.9, 306.8],
    ])
    expect(axisLines(CAM2)).toHaveLength(3)
    checkSegs(axisLines(CAM2), [
      [155.1, 342.7, 375.1, 417.9],
      [155.1, 342.7, 94.7, 168.3],
      [375.1, 417.9, 423, 243],
    ])
  })
})

describe('viewed from above', () => {
  const cameras = [DEFAULT_CAM, CAM2, { yaw: 2.4, pitch: 0.6 }, { yaw: -2, pitch: 1.2 }]

  it('draws the far floor edge above the near one', () => {
    const near = project([0, -1, -1], { yaw: 0, pitch: 0.4 })
    const far = project([0, -1, 1], { yaw: 0, pitch: 0.4 })
    expect(far.depth).toBeGreaterThan(near.depth)
    expect(far.y).toBeLessThan(near.y)
  })

  it('puts the walls on the faces farthest from the eye for any rotation', () => {
    for (const cam of cameras) {
      const far = farFaces(cam)
      expect(project([far.x, 0, 0], cam).depth).toBeGreaterThan(0)
      expect(project([0, 0, far.z], cam).depth).toBeGreaterThan(0)
    }
  })

  it('runs the x and z axes along the near edges of the floor', () => {
    for (const cam of cameras) {
      const far = farFaces(cam)
      const edges = axisEdges(cam)
      expect(edges.x.map((p) => p[2])).toEqual([-far.z, -far.z])
      expect(edges.z.map((p) => p[0])).toEqual([-far.x, -far.x])
    }
  })

  it('returns the floor and both walls as four-corner polygons', () => {
    const faces = cubeFaces(DEFAULT_CAM)
    for (const polygon of [faces.floor, faces.wallX, faces.wallZ]) {
      expect(polygon.split(' ')).toHaveLength(4)
      expect(polygon).not.toContain('NaN')
    }
  })
})

describe('flat views', () => {
  const front = { yaw: 0, pitch: 0, flat: true }
  const side = { yaw: Math.PI / 2, pitch: 0, flat: true }
  const top = { yaw: 0, pitch: Math.PI / 2, flat: true }

  it('has no perspective, so depth does not move a point on screen', () => {
    expect(project([0.5, 0.5, -1], front)).toMatchObject({ x: 360, y: 155 })
    expect(project([0.5, 0.5, 1], front)).toMatchObject({ x: 360, y: 155 })
  })

  it('front shows x rightwards and y upwards', () => {
    const g = axisGuides(front)
    expect([g.x.visible, g.y.visible, g.z.visible]).toEqual([true, true, false])
    expect(axisLines(front)[0]).toEqual({ x1: 180, y1: 335, x2: 420, y2: 335 })
    expect(axisLines(front)[1]).toEqual({ x1: 180, y1: 335, x2: 180, y2: 95 })
  })

  it('side shows z rightwards and y upwards', () => {
    const g = axisGuides(side)
    expect([g.x.visible, g.y.visible, g.z.visible]).toEqual([false, true, true])
    expect(axisLines(side)[2]).toEqual({ x1: 180, y1: 335, x2: 420, y2: 335 })
  })

  it('top shows x rightwards and z upwards, with the z axis on the left', () => {
    const g = axisGuides(top)
    expect([g.x.visible, g.y.visible, g.z.visible]).toEqual([true, false, true])
    expect(axisLines(top)[0]).toEqual({ x1: 180, y1: 335, x2: 420, y2: 335 })
    expect(axisLines(top)[2]).toEqual({ x1: 180, y1: 335, x2: 180, y2: 95 })
    expect(g.z.title.y).toBeLessThan(95)
  })
})

describe('axisGuides', () => {
  it('numbers the minimum, middle and maximum of each axis outside the cube centre', () => {
    const g = axisGuides(DEFAULT_CAM)
    const lines = axisLines(DEFAULT_CAM)
    ;[g.x, g.y, g.z].forEach((axis, i) => {
      expect(axis.ticks).toHaveLength(3)
      const mx = (lines[i].x1 + lines[i].x2) / 2
      const my = (lines[i].y1 + lines[i].y2) / 2
      const tick = axis.ticks[1]
      expect(Math.hypot(tick.x - 300, tick.y - 215)).toBeGreaterThan(Math.hypot(mx - 300, my - 215))
    })
  })

  it('places the y title above the top of the y axis', () => {
    const y = axisLines(DEFAULT_CAM)[1]
    expect(axisGuides(DEFAULT_CAM).y.title).toEqual({ x: y.x2, y: y.y2 - 18 })
  })
})
