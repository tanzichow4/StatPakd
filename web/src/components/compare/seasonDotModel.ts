import type { Entity, StatDef } from '../../domain/types'
import { formatStat } from '../../lib/stats'
import { seriesColor } from '../../styles/series'
import { categoryAt, valueAxis, type GraphModel, type GraphPoint } from '../dotgraph/graphModel'
import type { CompareColumn } from './tableModel'

export interface SeasonGraph {
  model: GraphModel
  /** Selected entities without a value for the chosen stats. */
  missing: string[]
}

const values = (entities: readonly Entity[], key: string): number[] => {
  const out: number[] = []
  for (const e of entities) {
    const v = e.stats[key]
    if (v != null) out.push(v)
  }
  return out
}

/** One stat along x, one row for each selected entity. */
export function rowGraph(
  columns: readonly CompareColumn[],
  pool: readonly Entity[],
  x: StatDef,
): SeasonGraph {
  const axis = valueAxis(values(pool, x.key), x, false)
  const points: GraphPoint[] = []
  const missing: string[] = []
  columns.forEach(({ entity, colorIndex }, i) => {
    const v = entity.stats[x.key]
    if (v == null) {
      missing.push(entity.shortName)
      return
    }
    const text = formatStat(v, x)
    points.push({
      id: entity.id,
      x: axis.at(v),
      y: categoryAt(i, columns.length),
      color: seriesColor(colorIndex),
      description: `${entity.name}: ${x.label} ${text}`,
      text,
    })
  })
  return {
    model: {
      xTitle: x.label,
      yTitle: '',
      xTicks: axis.ticks,
      yTicks: columns.map(({ entity }, i) => ({
        at: categoryAt(i, columns.length),
        label: entity.shortName,
      })),
      points,
      lines: [],
    },
    missing,
  }
}

/** One stat against another: selected entities in colour, the rest of the pool in gray. */
export function scatterGraph(
  columns: readonly CompareColumn[],
  pool: readonly Entity[],
  x: StatDef,
  y: StatDef,
): SeasonGraph {
  const both = pool.filter((e) => e.stats[x.key] != null && e.stats[y.key] != null)
  const ax = valueAxis(values(both, x.key), x, false)
  const ay = valueAxis(values(both, y.key), y, true)
  const colors = new Map(columns.map((c) => [c.entity.id, seriesColor(c.colorIndex)]))
  const points = both.map((e): GraphPoint => {
    const color = colors.get(e.id)
    const xv = e.stats[x.key] as number
    const yv = e.stats[y.key] as number
    return {
      id: e.id,
      x: ax.at(xv),
      y: 100 - ay.at(yv),
      color: color ?? '',
      description: `${e.name}: ${x.label} ${formatStat(xv, x)}, ${y.label} ${formatStat(yv, y)}`,
      ...(color ? { text: e.shortName } : { muted: true }),
    }
  })
  // Selected dots go last so they sit on top of the gray ones.
  points.sort((a, b) => Number(!a.muted) - Number(!b.muted))
  return {
    model: {
      xTitle: x.label,
      yTitle: y.label,
      xTicks: ax.ticks,
      yTicks: ay.ticks,
      points,
      lines: [],
    },
    missing: columns
      .filter(({ entity }) => !both.some((e) => e.id === entity.id))
      .map(({ entity }) => entity.shortName),
  }
}
