import type { Entity, EntityKind } from '../../domain/types'
import { ALL_POSITIONS } from '../../state'

/** Text identifying the team of an entity: its team id, or its short name for teams. */
export function teamText(e: Entity): string {
  return e.teamId ?? e.shortName
}

/** Case-insensitive substring match on name or team text; an empty query matches everything. */
export function matchesQuery(e: Entity, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (needle === '') return true
  return e.name.toLowerCase().includes(needle) || teamText(e).toLowerCase().includes(needle)
}

/** "All" followed by the distinct positions in first-appearance order. */
export function positionChips(entities: Entity[]): string[] {
  const chips = [ALL_POSITIONS]
  for (const e of entities) {
    if (e.position && !chips.includes(e.position)) chips.push(e.position)
  }
  return chips
}

/** Entities matching the query AND the position (ALL_POSITIONS means any), in input order. */
export function filterEntities(entities: Entity[], q: string, pos: string): Entity[] {
  return entities.filter((e) => matchesQuery(e, q) && (pos === ALL_POSITIONS || e.position === pos))
}

export function kindSingular(kind: EntityKind): string {
  return kind === 'players' ? 'player' : 'team'
}

/**
 * Pixels to move a popover left so its right edge is at least `margin` inside the viewport,
 * never moving its left edge past `margin` from the viewport's left edge. 0 when it fits.
 */
export function popoverShift(
  anchorLeft: number,
  width: number,
  viewportWidth: number,
  margin = 8,
): number {
  const overflow = anchorLeft + width + margin - viewportWidth
  if (overflow <= 0) return 0
  return Math.min(overflow, Math.max(0, anchorLeft - margin))
}
