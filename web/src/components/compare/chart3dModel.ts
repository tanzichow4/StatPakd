import type { Entity, StatDef } from '../../domain/types'
import { NULL_PLACEHOLDER, formatStat } from '../../lib/stats'
import {
  CENTER_X,
  axisLabelAnchors,
  axisLines,
  cubeEdges,
  dragCamera,
  gridLines,
  plotPoints,
  type AxisKeys,
  type Camera,
  type Line,
  type PlotPoint,
} from '../../lib/projection'
import { canonicalStatOrder, type AppAction } from '../../state'
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
  side: 'before' | 'after'
}

/** Labels are capped at 40% of the card width, so they need that much room on their open side. */
const LABEL_MAX_PCT = 40

/** Overlay position of the three axis labels. Labels near an edge flip to open inwards. */
export function axisLabelLayout(camera: Camera, defs3: AxisDefs): AxisLabel[] {
  const a = axisLabelAnchors(camera)
  const anchors = [a.x, a.y, a.z]
  return LETTERS.map((letter, i) => {
    const left = pct(anchors[i].x, CHART3D.width)
    let side: AxisLabel['side'] = anchors[i].x < CENTER_X ? 'before' : 'after'
    if (side === 'before' && left < LABEL_MAX_PCT) side = 'after'
    else if (side === 'after' && left > 100 - LABEL_MAX_PCT) side = 'before'
    return {
      letter,
      text: `${letter} · ${defs3[i]?.label ?? ''}`,
      left,
      top: pct(Math.max(LABEL_MIN_Y, anchors[i].y), CHART3D.height),
      side,
    }
  })
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

export interface Chart3DModel {
  ok: boolean
  grid: Line[]
  edges: Line[]
  axes: Line[]
  points: PlotPoint[]
  tags: NameTag[]
  labels: AxisLabel[]
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
    return { ok: false, grid: [], edges: [], axes: [], points: [], tags: [], labels }
  }
  const byId = new Map(pool.map((e) => [e.id, e]))
  const points = drawOrder(plotPoints(pool, axes, selIds, camera))
  const tags: NameTag[] = []
  for (const p of points) {
    if (p.selIndex < 0) continue
    const entity = byId.get(p.id)
    if (entity) tags.push({ id: p.id, name: entity.shortName, ...nameTagPosition(p) })
  }
  return {
    ok: true,
    grid: gridLines(camera),
    edges: cubeEdges(camera),
    axes: axisLines(camera),
    points,
    tags,
    labels,
  }
}
