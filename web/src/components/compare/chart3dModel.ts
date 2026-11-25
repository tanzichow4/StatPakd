import type { Entity, StatDef } from '../../domain/types'
import { NULL_PLACEHOLDER, formatStat, leagueRange } from '../../lib/stats'
import {
  CENTER_X,
  TICK_STEPS,
  axisGuides,
  axisLines,
  cubeEdges,
  cubeFaces,
  depthScale,
  dragCamera,
  gridLines,
  plotPoints,
  type AxisKeys,
  type Camera,
  type Line,
  type PlotPoint,
} from '../../lib/projection'
import { FLAT_VIEWS, canonicalStatOrder, type AppAction, type CameraPreset } from '../../state'
import type { SelectOption } from '../ui/Select'
import type { CompareColumn } from './tableModel'

export const CHART3D = { width: 600, height: 460 } as const
/** Axis labels are never placed above this y (viewBox units). */
export const LABEL_MIN_Y = 10
/** Horizontal offset of a name tag from its point. */
export const NAME_TAG_DX = 10
/** Keyboard step, equal to this many pixels of drag. */
export const KEY_STEP_PX = 10
/** Step multiplier while Shift is held. */
export const SHIFT_MULTIPLIER = 5
/** Dot radius at the cube centre; nearer dots are drawn bigger. */
export const SELECTED_RADIUS = 8
export const UNSELECTED_RADIUS = 4.5
/** Pointer travel (px) below which a press is a tap, not a drag. */
export const DRAG_THRESHOLD_PX = 3
/** How close (viewBox units) the pointer must be to pick a dot. */
export const PICK_DISTANCE = 18
/** Room a name tag takes (viewBox units), used to stop tags overlapping. */
export const TAG_WIDTH = 90
export const TAG_HEIGHT = 22
/** With more points than this, the drop lines of unselected points are not drawn. */
export const CROWDED = 100

export type AxisLetter = 'X' | 'Y' | 'Z'
const LETTERS: readonly AxisLetter[] = ['X', 'Y', 'Z']

export type AxisDefs = readonly [StatDef | undefined, StatDef | undefined, StatDef | undefined]

/** Percentage with 1 decimal. */
export function pct(v: number, total: number): number {
  return Math.round((v / total) * 1000) / 10
}

export interface AxisLabel {
  letter: AxisLetter
  text: string
  left: number
  top: number
  /** Which way the text opens from its position. */
  side: 'before' | 'after' | 'center'
  /** True when the axis points at the viewer, so it has no title. */
  hidden: boolean
}

/** Labels are capped at 40% of the card width, so they need that much room on their open side. */
const LABEL_MAX_PCT = 40

/** Overlay position of the three axis labels. Labels near an edge flip to open inwards. */
export function axisLabelLayout(camera: Camera, defs3: AxisDefs): AxisLabel[] {
  const g = axisGuides(camera)
  const guides = [g.x, g.y, g.z]
  return LETTERS.map((letter, i) => {
    const { title, visible } = guides[i]
    const left = pct(title.x, CHART3D.width)
    let side: AxisLabel['side'] = title.x < CENTER_X ? 'before' : 'after'
    if (side === 'before' && left < LABEL_MAX_PCT) side = 'after'
    else if (side === 'after' && left > 100 - LABEL_MAX_PCT) side = 'before'
    // X and Z titles sit centred below their axes, unless shown upright in a flat view.
    const upright = letter === 'Y' || (camera.flat === true && Math.abs(title.x - CENTER_X) >= 1)
    if (!upright) side = 'center'
    const half = LABEL_MAX_PCT / 2
    return {
      letter,
      text: `${letter} · ${defs3[i]?.label ?? ''}`,
      left: side === 'center' ? Math.min(100 - half, Math.max(half, left)) : left,
      top: pct(Math.max(LABEL_MIN_Y, title.y), CHART3D.height),
      side,
      hidden: !visible,
    }
  })
}

export interface AxisTick {
  key: string
  text: string
  left: number
  top: number
}

/** League minimum, middle and maximum along each visible axis. */
export function axisTicks(
  pool: readonly Entity[],
  axes: AxisKeys,
  camera: Camera,
  defs3: AxisDefs,
): AxisTick[] {
  const g = axisGuides(camera)
  const guides = [g.x, g.y, g.z]
  const out: AxisTick[] = []
  guides.forEach(({ ticks }, i) => {
    const def = defs3[i]
    const range = leagueRange(pool, axes[i])
    if (!def || !range || ticks.length === 0) return
    TICK_STEPS.forEach((step, j) => {
      // With a single league value every point sits mid-axis, so only that tick is numbered.
      if (range.min === range.max && step !== 0) return
      const middle = (range.min + range.max) / 2
      const value =
        step < 0 ? range.min : step > 0 ? range.max : def.decimals ? middle : Math.round(middle)
      out.push({
        key: `${LETTERS[i]}${step}`,
        text: formatStat(value, def),
        left: pct(ticks[j].x, CHART3D.width),
        top: pct(ticks[j].y, CHART3D.height),
      })
    })
  })
  return out
}

/** Overlay position of a selected point's name tag. */
export function nameTagPosition(point: Pick<PlotPoint, 'x' | 'y'>): { left: number; top: number } {
  return {
    left: pct(point.x + NAME_TAG_DX, CHART3D.width),
    top: pct(point.y, CHART3D.height),
  }
}

/** Unselected points first, then selected; relative (back-to-front) order is kept. */
export function drawOrder(points: readonly PlotPoint[]): PlotPoint[] {
  return [...points.filter((p) => p.selIndex < 0), ...points.filter((p) => p.selIndex >= 0)]
}

export interface KeyInput {
  key: string
  shiftKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
  metaKey?: boolean
}

/** Action for a key press on the plot, or null when the key is not handled. */
export function cameraForKey(
  e: KeyInput,
  camera: Camera,
): Extract<AppAction, { type: 'setCamera' | 'resetView' }> | null {
  if (e.ctrlKey || e.altKey || e.metaKey) return null
  const step = KEY_STEP_PX * (e.shiftKey ? SHIFT_MULTIPLIER : 1)
  let dx = 0
  let dy = 0
  switch (e.key) {
    case 'ArrowRight':
      dx = step
      break
    case 'ArrowLeft':
      dx = -step
      break
    case 'ArrowDown':
      dy = step
      break
    case 'ArrowUp':
      dy = -step
      break
    case 'Home':
      return { type: 'resetView' }
    default:
      return null
  }
  const next = dragCamera(camera, dx, dy)
  return { type: 'setCamera', yaw: next.yaw, pitch: next.pitch }
}

/** Stat definitions for the three axis keys (undefined when a key has no definition). */
export function axisDefs(axes: AxisKeys, defs: readonly StatDef[]): AxisDefs {
  const byKey = new Map(defs.map((d) => [d.key, d]))
  return [byKey.get(axes[0]), byKey.get(axes[1]), byKey.get(axes[2])]
}

export function axesComplete(defs3: AxisDefs): boolean {
  return defs3.every((d) => d !== undefined)
}

/** Select options in canonical stat order. */
export function axisOptions(defs: readonly StatDef[]): SelectOption[] {
  const byKey = new Map(defs.map((d) => [d.key, d]))
  const options: SelectOption[] = []
  for (const key of canonicalStatOrder(defs)) {
    const def = byKey.get(key)
    if (def) options.push({ value: def.key, label: def.label })
  }
  return options
}

export interface ReadoutCell {
  letter: AxisLetter
  label: string
  text: string
  na: boolean
}

export interface ReadoutCard {
  entity: Entity
  colorIndex: number
  cells: [ReadoutCell, ReadoutCell, ReadoutCell]
}

/** One readout card per column, with X/Y/Z cells. */
export function readoutModel(columns: readonly CompareColumn[], axes: AxisKeys, defs3: AxisDefs) {
  return columns.map(({ entity, colorIndex }): ReadoutCard => {
    const cell = (i: number): ReadoutCell => {
      const def = defs3[i]
      const value = entity.stats[axes[i]]
      const na = !def || value == null
      return {
        letter: LETTERS[i],
        label: def?.label ?? '',
        text: na || !def ? NULL_PLACEHOLDER : formatStat(value, def),
        na,
      }
    }
    return { entity, colorIndex, cells: [cell(0), cell(1), cell(2)] }
  })
}

export interface NameTag {
  id: string
  name: string
  left: number
  top: number
}

/** A plotted point with the radius it is drawn at. */
export interface DrawnPoint extends PlotPoint {
  r: number
}

export interface Chart3DModel {
  ok: boolean
  faces: { floor: string; wallX: string; wallZ: string } | null
  grid: Line[]
  edges: Line[]
  axes: Line[]
  points: DrawnPoint[]
  tags: NameTag[]
  labels: AxisLabel[]
  ticks: AxisTick[]
}

/** Tag positions for the points, moving a tag down when it would cover an earlier one. */
export function placeTags(points: readonly PlotPoint[]): Map<string, { x: number; y: number }> {
  const placed = new Map<string, { x: number; y: number }>()
  for (const p of [...points].sort((a, b) => a.y - b.y || a.x - b.x)) {
    let y = p.y
    const blocker = () =>
      [...placed.values()].find(
        (q) => Math.abs(q.x - p.x) < TAG_WIDTH && Math.abs(q.y - y) < TAG_HEIGHT,
      )
    for (let hit = blocker(); hit; hit = blocker()) y = hit.y + TAG_HEIGHT
    placed.set(p.id, { x: p.x, y })
  }
  return placed
}

/** The point closest to a viewBox position, if one is close enough. Selected points win ties. */
export function nearestPoint(
  points: readonly PlotPoint[],
  x: number,
  y: number,
  limit = PICK_DISTANCE,
): string | null {
  let best: string | null = null
  let bestDistance = limit
  // Later points are drawn on top, so an equally close later point replaces an earlier one.
  for (const p of points) {
    const distance = Math.hypot(p.x - x, p.y - y)
    if (distance <= bestDistance) {
      best = p.id
      bestDistance = distance
    }
  }
  return best
}

/** The next dot for keyboard stepping: selected first in selection order, then pool order. */
export function stepPoint(
  pool: readonly Entity[],
  points: readonly PlotPoint[],
  current: string | null,
  direction: 1 | -1,
): string | null {
  const poolIndex = new Map(pool.map((e, i) => [e.id, i]))
  const rank = (p: PlotPoint) =>
    p.selIndex >= 0 ? p.selIndex : pool.length + (poolIndex.get(p.id) ?? 0)
  const ids = [...points].sort((a, b) => rank(a) - rank(b)).map((p) => p.id)
  if (ids.length === 0) return null
  const at = current === null ? -1 : ids.indexOf(current)
  if (at < 0) return direction === 1 ? ids[0] : ids[ids.length - 1]
  return ids[(at + direction + ids.length) % ids.length]
}

/** Spoken form of one readout card. */
export function describeCard(card: ReadoutCard): string {
  const cells = card.cells.map((c) => `${c.label} ${c.na ? 'not applicable' : c.text}`)
  return `${card.entity.name}: ${cells.join(', ')}`
}

/** The flat view a camera shows, or "3d" for the rotating view. */
export function presetOf(camera: Camera): CameraPreset {
  if (camera.flat) {
    for (const preset of ['front', 'side', 'top'] as const) {
      const view = FLAT_VIEWS[preset]
      if (view.yaw === camera.yaw && view.pitch === camera.pitch) return preset
    }
  }
  return '3d'
}

/** Everything the chart needs to render at a camera. Geometry is empty when an axis is missing. */
export function chart3dModel(
  pool: readonly Entity[],
  axes: AxisKeys,
  selIds: readonly string[],
  camera: Camera,
  defs3: AxisDefs,
): Chart3DModel {
  const labels = axisLabelLayout(camera, defs3)
  if (!axesComplete(defs3)) {
    return {
      ok: false,
      faces: null,
      grid: [],
      edges: [],
      axes: [],
      points: [],
      tags: [],
      labels,
      ticks: [],
    }
  }
  const byId = new Map(pool.map((e) => [e.id, e]))
  const points = drawOrder(plotPoints(pool, axes, selIds, camera)).map((p): DrawnPoint => {
    const base = p.selIndex >= 0 ? SELECTED_RADIUS : UNSELECTED_RADIUS
    return { ...p, r: Math.round(base * depthScale(p.depth, camera) * 10) / 10 }
  })
  const selected = points.filter((p) => p.selIndex >= 0)
  const places = placeTags(selected)
  const tags: NameTag[] = []
  for (const p of selected) {
    const entity = byId.get(p.id)
    const place = places.get(p.id)
    if (entity && place) tags.push({ id: p.id, name: entity.shortName, ...nameTagPosition(place) })
  }
  return {
    ok: true,
    faces: cubeFaces(camera),
    grid: gridLines(camera),
    edges: cubeEdges(camera),
    axes: axisLines(camera),
    points,
    tags,
    labels,
    ticks: axisTicks(pool, axes, camera, defs3),
  }
}
