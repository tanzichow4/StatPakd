import { describe, expect, it } from 'vitest'
import { DEFAULT_PITCH, DEFAULT_YAW } from '../state/appState'
import { DEFAULT_CAMERA, project, toCube } from './projection'

const DEFAULT_CAM = { yaw: -0.65, pitch: 0.38 }

describe('project', () => {
  it('AC1: origin projects to (300, 242) with depth 0 at the default camera', () => {
    const p = project([0, 0, 0], DEFAULT_CAM)
    expect(p.x).toBeCloseTo(300, 10)
    expect(p.y).toBeCloseTo(242, 10)
    expect(p.depth).toBeCloseTo(0, 10)
  })

  it('AC1: origin projects to (300, 242) with depth 0 at many yaw/pitch values', () => {
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
      expect(p.y).toBeCloseTo(242, 10)
      expect(p.depth).toBeCloseTo(0, 10)
    }
  })

  it('AC2: (1, 1, 1) at the default camera -> (317.8, 203.8), depth 1.6722', () => {
    const p = project([1, 1, 1], DEFAULT_CAM)
    expect(p.x).toBeCloseTo(317.8, 5)
    expect(p.y).toBeCloseTo(203.8, 5)
    expect(p.depth).toBeCloseTo(1.6722, 4)
  })

  it('AC2: (1, -1, -1) at the default camera -> (504.2, 367.0), depth -0.5482', () => {
    const p = project([1, -1, -1], DEFAULT_CAM)
    expect(p.x).toBeCloseTo(504.2, 5)
    expect(p.y).toBeCloseTo(367.0, 5)
    expect(p.depth).toBeCloseTo(-0.5482, 4)
  })

  it('AC2: (-1, -1, -1) at the default camera -> (261.1, 325.3), depth -1.6722', () => {
    const p = project([-1, -1, -1], DEFAULT_CAM)
    expect(p.x).toBeCloseTo(261.1, 5)
    expect(p.y).toBeCloseTo(325.3, 5)
    expect(p.depth).toBeCloseTo(-1.6722, 4)
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
    expect(p.x).toBeCloseTo(428, 10)
    expect(p.y).toBeCloseTo(242, 10)
    expect(p.depth).toBeCloseTo(0, 10)
  })

  it('AC3: at yaw 0, pitch 0, (0, 1, 0) projects to (300, 114) with depth 0 (+y is up)', () => {
    const p = project([0, 1, 0], { yaw: 0, pitch: 0 })
    expect(p.x).toBeCloseTo(300, 10)
    expect(p.y).toBeCloseTo(114, 10)
    expect(p.depth).toBeCloseTo(0, 10)
  })

  it('AC3: negative axes mirror (-1, 0, 0) -> (172, 242) and (0, -1, 0) -> (300, 370)', () => {
    const a = project([-1, 0, 0], { yaw: 0, pitch: 0 })
    expect(a.x).toBeCloseTo(172, 10)
    expect(a.y).toBeCloseTo(242, 10)
    const b = project([0, -1, 0], { yaw: 0, pitch: 0 })
    expect(b.x).toBeCloseTo(300, 10)
    expect(b.y).toBeCloseTo(370, 10)
  })

  it('AC3: perspective makes farther points (larger z) sit closer to the centre', () => {
    const cam = { yaw: 0, pitch: 0 }
    const far = project([1, 0, 1], cam)
    const near = project([1, 0, -1], cam)
    expect(far.depth).toBeCloseTo(1, 10)
    expect(near.depth).toBeCloseTo(-1, 10)
    // 300 + 128 * 4.5 / 5.5 = 404.7 ; 300 + 128 * 4.5 / 3.5 = 464.6
    expect(far.x).toBeCloseTo(404.7, 5)
    expect(near.x).toBeCloseTo(464.6, 5)
    expect(far.x).toBeLessThan(near.x)
  })

  it('AC3: yaw of a quarter turn sends +x to the depth axis', () => {
    // X = x cos(yaw), Z1 = -x sin(yaw) so (1,0,0) at yaw pi/2 has depth -1, x about 300
    const p = project([1, 0, 0], { yaw: Math.PI / 2, pitch: 0 })
    expect(p.depth).toBeCloseTo(-1, 10)
    expect(p.x).toBeCloseTo(300, 5)
  })

  it('AC3: pitch of a quarter turn sends +y to the depth axis', () => {
    // Z = y sin(pitch) so (0,1,0) at pitch pi/2 has depth +1, y about 242
    const p = project([0, 1, 0], { yaw: 0, pitch: Math.PI / 2 })
    expect(p.depth).toBeCloseTo(1, 10)
    expect(p.y).toBeCloseTo(242, 5)
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
    expect(DEFAULT_CAMERA).toEqual({ yaw: -0.65, pitch: 0.38 })
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
