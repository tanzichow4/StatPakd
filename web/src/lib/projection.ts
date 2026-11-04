import type { Entity, StatValue } from '../domain/types'
import { DEFAULT_PITCH, DEFAULT_YAW, PITCH_MAX, PITCH_MIN } from '../state/appState'
import { leagueRange, normalize, type StatRange } from './stats'

/** Distance from the eye to the cube centre, used for perspective. */
export const PERSPECTIVE_DISTANCE = 4.5
/** Pixels per cube unit in the 600 x 460 SVG viewBox. */
export const SCALE = 128
/** Screen x of the cube origin. */
export const CENTER_X = 300
/** Screen y of the cube origin. */
export const CENTER_Y = 242
/** Yaw change (radians) per pixel of horizontal drag. */
export const YAW_PER_PX = 0.01
/** Pitch change (radians) per pixel of vertical drag. */
export const PITCH_PER_PX = 0.008
/** Grid line positions along each cube axis. */
export const GRID_STEPS: readonly number[] = [-1, -0.5, 0, 0.5, 1]

/** 3D anchor points for the X, Y and Z axis labels. */
export const AXIS_LABEL_ANCHORS: {
  readonly x: Vec3
  readonly y: Vec3
  readonly z: Vec3
} = {
  x: [1.12, -1.1, -1],
  y: [-1, 1.08, -1],
  z: [-1, -1.1, 1.12],
}

/** Camera orientation in radians. */
export interface Camera {
  readonly yaw: number
  readonly pitch: number
}

/** A point in cube space. */
export type Vec3 = readonly [number, number, number]

/** A projected point: screen coordinates (1 decimal) and unrounded depth (larger = farther). */
export interface Projected {
  readonly x: number
  readonly y: number
  readonly depth: number
}

/** A projected line segment. */
export interface Line {
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
}

/** One plotted entity in the 3D chart. */
export interface PlotPoint {
  readonly id: string
  /** Position in the selected list, or -1 when not selected. */
  readonly selIndex: number
  readonly x: number
  readonly y: number
  readonly depth: number
  /** Screen position of the drop-line foot, the projection of (x, -1, z). */
  readonly footX: number
  readonly footY: number
}

/** Default camera, taken from the app state defaults. */
export const DEFAULT_CAMERA: Camera = { yaw: DEFAULT_YAW, pitch: DEFAULT_PITCH }

/** Rounds to 1 decimal place. */
export function r1(v: number): number {
  return Math.round(v * 10) / 10
}

/** Projects a cube point to the screen: yaw, then pitch, then perspective. No pitch clamp. */
export function project(p: Vec3, cam: Camera): Projected {
  const [x, y, z] = p
  const cy = Math.cos(cam.yaw)
  const sy = Math.sin(cam.yaw)
  const X = x * cy + z * sy
  const Z1 = -x * sy + z * cy
  const cp = Math.cos(cam.pitch)
  const sp = Math.sin(cam.pitch)
  const Y = y * cp - Z1 * sp
  const depth = y * sp + Z1 * cp
  const f = PERSPECTIVE_DISTANCE / (PERSPECTIVE_DISTANCE + depth)
  return {
    x: r1(CENTER_X + X * SCALE * f),
    y: r1(CENTER_Y - Y * SCALE * f),
    depth,
  }
}

/**
 * Maps a stat value to a cube coordinate in [-1, 1]. Null or missing maps to -1, a degenerate or
 * missing range maps to 0. Lower-is-better stats are not inverted.
 */
export function toCube(value: StatValue | undefined, range: StatRange): number {
  return 2 * normalize(value, range, { lowerIsBetter: false }) - 1
}

/** Axis stat keys in X, Y, Z order. */
export type AxisKeys = readonly [string, string, string]

/**
 * Builds the plotted points, sorted back to front (descending depth, stable on pool order).
 * Includes pool entities with a non-null value on all three axes, plus every selected entity
 * (a null axis plots at -1). Selected ids missing from the pool are dropped. Inputs are not mutated.
 */
export function plotPoints(
  pool: ReadonlyArray<Pick<Entity, 'id' | 'stats'>>,
  axes: AxisKeys,
  selectedIds: readonly string[],
  cam: Camera,
): PlotPoint[] {
  const [kx, ky, kz] = axes
  const rx = leagueRange(pool, kx)
  const ry = leagueRange(pool, ky)
  const rz = leagueRange(pool, kz)
  const points: PlotPoint[] = []
  for (const entity of pool) {
    const s = entity.stats
    const selIndex = selectedIds.indexOf(entity.id)
    if (selIndex < 0 && (s[kx] == null || s[ky] == null || s[kz] == null)) continue
    const x = toCube(s[kx], rx)
    const y = toCube(s[ky], ry)
    const z = toCube(s[kz], rz)
    const c = project([x, y, z], cam)
    const foot = project([x, -1, z], cam)
    points.push({
      id: entity.id,
      selIndex,
      x: c.x,
      y: c.y,
      depth: c.depth,
      footX: foot.x,
      footY: foot.y,
    })
  }
  return points.sort((a, b) => b.depth - a.depth)
}

/** Clamps a pitch to [PITCH_MIN, PITCH_MAX]. */
export function clampPitch(pitch: number): number {
  return Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch))
}

/** Camera for a drag of (dx, dy) pixels from the camera at drag start. Yaw is never wrapped. */
export function dragCamera(start: Camera, dx: number, dy: number): Camera {
  return {
    yaw: start.yaw + dx * YAW_PER_PX,
    pitch: clampPitch(start.pitch + dy * PITCH_PER_PX),
  }
}

/** Projects both endpoints of a 3D segment. */
export function line(a: Vec3, b: Vec3, cam: Camera): Line {
  const p = project(a, cam)
  const q = project(b, cam)
  return { x1: p.x, y1: p.y, x2: q.x, y2: q.y }
}

/** Floor and back-wall grid: 20 lines in design order. */
export function gridLines(cam: Camera): Line[] {
  const out: Line[] = []
  for (const t of GRID_STEPS) {
    out.push(
      line([t, -1, -1], [t, -1, 1], cam),
      line([-1, -1, t], [1, -1, t], cam),
      line([-1, t, -1], [-1, t, 1], cam),
      line([-1, -1, t], [-1, 1, t], cam),
    )
  }
  return out
}

/** The 12 cube edges in design order. */
export function cubeEdges(cam: Camera): Line[] {
  const out: Line[] = []
  for (const a of [-1, 1]) {
    for (const b of [-1, 1]) {
      out.push(
        line([-1, a, b], [1, a, b], cam),
        line([a, -1, b], [a, 1, b], cam),
        line([a, b, -1], [a, b, 1], cam),
      )
    }
  }
  return out
}

/** The X, Y and Z axis lines from (-1, -1, -1). */
export function axisLines(cam: Camera): Line[] {
  return [
    line([-1, -1, -1], [1, -1, -1], cam),
    line([-1, -1, -1], [-1, 1, -1], cam),
    line([-1, -1, -1], [-1, -1, 1], cam),
  ]
}

/** Projected anchors for the X, Y and Z axis labels. */
export function axisLabelAnchors(cam: Camera): { x: Projected; y: Projected; z: Projected } {
  return {
    x: project(AXIS_LABEL_ANCHORS.x, cam),
    y: project(AXIS_LABEL_ANCHORS.y, cam),
    z: project(AXIS_LABEL_ANCHORS.z, cam),
  }
}
