import type { Entity, EntityId, StatDef } from '../../domain/types'
import { canonicalStatOrder } from '../../state'

/** Entity count from which column headers switch to the compact form. */
export const COMPACT_HEADER_MIN = 5

export interface CompareColumn {
  entity: Entity
  colorIndex: number
}

/** Columns in selection order; the colour index is the position in the selection. */
export function resolveColumns(
  selIds: readonly EntityId[],
  entities: readonly Entity[],
): CompareColumn[] {
  const byId = new Map(entities.map((e) => [e.id, e]))
  const columns: CompareColumn[] = []
  selIds.forEach((id, colorIndex) => {
    const entity = byId.get(id)
    if (entity) columns.push({ entity, colorIndex })
  })
  return columns
}

/** Selected stat keys that have a definition, in canonical order. */
export function resolveRows(statKeys: readonly string[], defs: readonly StatDef[]): StatDef[] {
  const wanted = new Set(statKeys)
  const byKey = new Map(defs.map((d) => [d.key, d]))
  const rows: StatDef[] = []
  for (const key of canonicalStatOrder(defs)) {
    const def = byKey.get(key)
    if (wanted.has(key) && def) rows.push(def)
  }
  return rows
}

export function tableMinWidth(n: number): number {
  return 190 + 130 * n
}

export function gridColumns(n: number): string {
  return `minmax(170px,1.3fr) repeat(${n}, minmax(0,1fr))`
}

export function headerLines(entity: Entity, compact: boolean): { title: string; sub?: string } {
  if (!compact) return { title: entity.name, sub: entity.meta }
  return entity.badge === entity.shortName
    ? { title: entity.shortName }
    : { title: entity.shortName, sub: entity.badge }
}
