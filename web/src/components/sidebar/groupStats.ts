import type { StatDef } from '../../domain/types'

export interface StatGroupModel {
  name: string
  selected: StatDef[]
  unselected: StatDef[]
}

/** Groups defs by first appearance; splits each group into selected and unselected, in def order. */
export function groupStats(
  defs: readonly StatDef[],
  selectedKeys: readonly string[],
): StatGroupModel[] {
  const selectedSet = new Set(selectedKeys)
  const groups: StatGroupModel[] = []
  const byName = new Map<string, StatGroupModel>()
  for (const def of defs) {
    let group = byName.get(def.group)
    if (!group) {
      group = { name: def.group, selected: [], unselected: [] }
      byName.set(def.group, group)
      groups.push(group)
    }
    if (selectedSet.has(def.key)) group.selected.push(def)
    else group.unselected.push(def)
  }
  return groups
}
