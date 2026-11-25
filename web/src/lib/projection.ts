import type { Entity, StatValue } from '../domain/types'
import { DEFAULT_PITCH, DEFAULT_YAW, PITCH_MAX, PITCH_MIN } from '../state/appState'
import { leagueRange, normalize, type StatRange } from './stats'

/** Distance from the eye to the cube centre, used for perspective. */
export const PERSPECTIVE_DISTANCE = 4.5
/** Pixels per cube unit in the 600 x 460 SVG viewBox. */
export const SCALE = 120
/** Screen x of the cube origin. */
export const CENTER_X = 300
/** Screen y of the cube origin. */
export const CENTER_Y = 215
/** Yaw change (radians) per pixel of horizontal drag. */
export const YAW_PER_PX = 0.01
/** Pitch change (radians) per pixel of vertical drag. */
export const PITCH_PER_PX = 0.008
/** Grid line positions along each cube axis. */
export const GRID_STEPS: readonly number[] = [-1, -0.5, 0, 0.5, 1]

/** Camera orientation in radians. */
export interface Camera {
  readonly yaw: number
  readonly pitch: number
  /** True for a straight-on view with no perspective, so positions can be read exactly. */
  readonly flat?: boolean
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

/** Size multiplier of something at a depth: 1 at the cube centre, larger when nearer. */
export function depthScale(depth: number, cam: Camera): number {
  return cam.flat ? 1 : PERSPECTIVE_DISTANCE / (PERSPECTIVE_DISTANCE + depth)
}

/**
 * Projects a cube point to the screen: yaw, then pitch, then perspective. A positive pitch looks
 * down on the cube from above. No pitch clamp.
 */
export function project(p: Vec3, cam: Camera): Projected {
  const [x, y, z] = p
  const cy = Math.cos(cam.yaw)
  const sy = Math.sin(cam.yaw)
  const X = x * cy + z * sy
  const Z1 = -x * sy + z * cy
  const cp = Math.cos(cam.pitch)
  const sp = Math.sin(cam.pitch)
  const Y = y * cp + Z1 * sp
  const depth = Z1 * cp - y * sp
  const f = depthScale(depth, cam)
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

/** Which side of a cube axis a face or edge is on. */
export type Side = -1 | 1

/** Depths closer than this count as equal, as in the flat views. */
const DEPTH_EPSILON = 1e-9

/**
 * The x and z faces farthest from the eye, where the back walls go. When both faces are equally
 * far (a flat view), x is -1 and z is +1, which keeps the axes at the left and bottom.
 */
export function farFaces(cam: Camera): { x: Side; z: Side } {
  const depth = (p: Vec3) => project(p, cam).depth
  return {
    x: depth([1, 0, 0]) > depth([-1, 0, 0]) + DEPTH_EPSILON ? 1 : -1,
    z: depth([0, 0, -1]) > depth([0, 0, 1]) + DEPTH_EPSILON ? -1 : 1,
  }
}

/** Floor and two back-wall grids: 6 lines for each grid step. */
export function gridLines(cam: Camera): Line[] {
  const far = farFaces(cam)
  const out: Line[] = []
  for (const t of GRID_STEPS) {
    out.push(
      line([t, -1, -1], [t, -1, 1], cam),
      line([-1, -1, t], [1, -1, t], cam),
      line([far.x, t, -1], [far.x, t, 1], cam),
      line([far.x, -1, t], [far.x, 1, t], cam),
      line([-1, t, far.z], [1, t, far.z], cam),
      line([t, -1, far.z], [t, 1, far.z], cam),
    )
  }
  return out
}

/** The floor and the two back walls as SVG polygon point lists. */
export function cubeFaces(cam: Camera): { floor: string; wallX: string; wallZ: string } {
  const far = farFaces(cam)
  const polygon = (corners: readonly Vec3[]) =>
    corners
      .map((c) => {
        const p = project(c, cam)
        return `${p.x},${p.y}`
      })
      .join(' ')
  return {
    floor: polygon([
      [-1, -1, -1],
      [1, -1, -1],
      [1, -1, 1],
      [-1, -1, 1],
    ]),
    wallX: polygon([
      [far.x, -1, -1],
      [far.x, 1, -1],
      [far.x, 1, 1],
      [far.x, -1, 1],
    ]),
    wallZ: polygon([
      [-1, -1, far.z],
      [-1, 1, far.z],
      [1, 1, far.z],
      [1, -1, far.z],
    ]),
  }
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

/** The two ends of an axis edge, from the lowest value to the highest. */
export type Edge = readonly [Vec3, Vec3]

/**
 * The cube edges that carry the X, Y and Z axes. X and Z run along the near edges of the floor and
 * Y is the left-hand upright edge, so the numbers are never behind the points.
 */
export function axisEdges(cam: Camera): { x: Edge; y: Edge; z: Edge } {
  const far = farFaces(cam)
  // When both x faces are equally far (front and top views) the Z axis goes on the left.
  const xTie =
    Math.abs(project([1, 0, 0], cam).depth - project([-1, 0, 0], cam).depth) <= DEPTH_EPSILON
  const nearX: Side = xTie || far.x === 1 ? -1 : 1
  const nearZ: Side = far.z === 1 ? -1 : 1
  const a: Vec3 = [nearX, 0, far.z]
  const b: Vec3 = [far.x, 0, nearZ]
  const [ux, , uz] = project(a, cam).x <= project(b, cam).x ? a : b
  return {
    x: [
      [-1, -1, nearZ],
      [1, -1, nearZ],
    ],
    y: [
      [ux, -1, uz],
      [ux, 1, uz],
    ],
    z: [
      [nearX, -1, -1],
      [nearX, -1, 1],
    ],
  }
}

/** The X, Y and Z axis lines. */
export function axisLines(cam: Camera): Line[] {
  const e = axisEdges(cam)
  return [e.x, e.y, e.z].map(([from, to]) => line(from, to, cam))
}

/** Axis edges shorter than this on screen point at the viewer and carry no numbers. */
export const MIN_AXIS_LENGTH = 40
/** Distance from an axis edge to its numbers, in viewBox units. */
export const TICK_OFFSET = 18
/** Distance from an axis edge to its X or Z title. */
export const TITLE_OFFSET = 44
/** Distance from the top of the Y axis to its title. */
export const Y_TITLE_OFFSET = 18
/** Positions of the numbered ticks: minimum, middle and maximum. */
export const TICK_STEPS: readonly number[] = [-1, 0, 1]

export interface ScreenPoint {
  readonly x: number
  readonly y: number
}

export interface AxisGuide {
  /** False when the axis points straight at the viewer. */
  readonly visible: boolean
  /** Number positions, one for each tick step. Empty when not visible. */
  readonly ticks: readonly ScreenPoint[]
  readonly title: ScreenPoint
}

/** Unit vector at right angles to a screen segment, pointing away from the cube centre. */
function outward(p: ScreenPoint, q: ScreenPoint): ScreenPoint {
  const length = Math.hypot(q.x - p.x, q.y - p.y) || 1
  let nx = -(q.y - p.y) / length
  let ny = (q.x - p.x) / length
  const side = nx * ((p.x + q.x) / 2 - CENTER_X) + ny * ((p.y + q.y) / 2 - CENTER_Y)
  if (side < 0) {
    nx = -nx
    ny = -ny
  }
  return { x: nx, y: ny }
}

function guide([from, to]: Edge, cam: Camera, upright: boolean): AxisGuide {
  const p = project(from, cam)
  const q = project(to, cam)
  const visible = Math.hypot(q.x - p.x, q.y - p.y) >= MIN_AXIS_LENGTH
  const n = outward(p, q)
  const away = (point: ScreenPoint, by: number) => ({
    x: r1(point.x + n.x * by),
    y: r1(point.y + n.y * by),
  })
  const along = (t: number) => {
    const k = (t + 1) / 2
    return project(
      [
        from[0] + (to[0] - from[0]) * k,
        from[1] + (to[1] - from[1]) * k,
        from[2] + (to[2] - from[2]) * k,
      ],
      cam,
    )
  }
  // The Y title sits above its axis, as does any axis shown upright in a flat view.
  const above = upright || (cam.flat === true && Math.abs(q.x - p.x) < 1)
  return {
    visible,
    ticks: visible ? TICK_STEPS.map((t) => away(along(t), TICK_OFFSET)) : [],
    title: above ? { x: q.x, y: r1(q.y - Y_TITLE_OFFSET) } : away(along(0), TITLE_OFFSET),
  }
}

/** Where the numbers and the title of each axis go. */
export function axisGuides(cam: Camera): { x: AxisGuide; y: AxisGuide; z: AxisGuide } {
  const e = axisEdges(cam)
  return { x: guide(e.x, cam, false), y: guide(e.y, cam, true), z: guide(e.z, cam, false) }
}
