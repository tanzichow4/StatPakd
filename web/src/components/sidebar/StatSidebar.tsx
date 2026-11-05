import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef } from 'react'
import { useAppState } from '../../state'
import { useAnnounce } from '../a11y'
import { groupStats } from './groupStats'
import { StatGroup } from './StatGroup'
import styles from './StatSidebar.module.css'
import { useStatDefs } from './useStatDefs'

type PendingFocus =
  { to: 'stat'; key: string } | { to: 'afterRemove'; groupIndex: number; rowIndex: number }

export function StatSidebar() {
  const { state, dispatch } = useAppState()
  const { kind } = state
  const baseId = useId()
  const announce = useAnnounce()
  const defs = useStatDefs(kind)
  const selectedKeys = state.stats[kind]
  const groups = useMemo(() => groupStats(defs, selectedKeys), [defs, selectedKeys])
  const locked = selectedKeys.length === 1

  const checkboxRefs = useRef(new Map<string, HTMLInputElement>())
  const addButtonRefs = useRef(new Map<number, HTMLButtonElement>())
  const pendingFocus = useRef<PendingFocus | null>(null)
  const prevKind = useRef(kind)

  useLayoutEffect(() => {
    if (prevKind.current === kind) return
    prevKind.current = kind
    dispatch({ type: 'closeAddStatMenu' })
  }, [kind, dispatch])

  useEffect(() => {
    const pending = pendingFocus.current
    if (!pending) return
    pendingFocus.current = null
    if (pending.to === 'stat') {
      checkboxRefs.current.get(pending.key)?.focus()
      return
    }
    const rows = groups[pending.groupIndex]?.selected ?? []
    const target = rows[pending.rowIndex] ?? rows[pending.rowIndex - 1]
    if (target) checkboxRefs.current.get(target.key)?.focus()
    else addButtonRefs.current.get(pending.groupIndex)?.focus()
  }, [groups])

  const checkboxRef = useCallback((key: string, node: HTMLInputElement | null) => {
    if (node) checkboxRefs.current.set(key, node)
    else checkboxRefs.current.delete(key)
  }, [])

  const openIndex = groups.findIndex((g) => g.name === state.addStatOpen && g.unselected.length > 0)

  return (
    <aside aria-label="Stats" className={styles.root}>
      {groups.map((group, index) => (
        <StatGroup
          key={group.name}
          group={group}
          locked={locked}
          open={index === openIndex}
          menuId={`${baseId}-menu-${index}`}
          headingId={`${baseId}-heading-${index}`}
          onDeselect={(key, rowIndex) => {
            if (locked) return
            pendingFocus.current = { to: 'afterRemove', groupIndex: index, rowIndex }
            const label = defs.find((d) => d.key === key)?.label
            if (label) announce(`${label} removed`)
            dispatch({ type: 'toggleStat', key })
          }}
          onToggleMenu={() => dispatch({ type: 'toggleAddStatMenu', group: group.name })}
          onPick={(key) => {
            pendingFocus.current = { to: 'stat', key }
            const label = defs.find((d) => d.key === key)?.label
            if (label) announce(`${label} added`)
            dispatch({ type: 'addStat', key })
          }}
          onClose={(reason) => {
            dispatch({ type: 'closeAddStatMenu' })
            if (reason === 'escape') addButtonRefs.current.get(index)?.focus()
          }}
          checkboxRef={checkboxRef}
          addButtonRef={(node) => {
            if (node) addButtonRefs.current.set(index, node)
            else addButtonRefs.current.delete(index)
          }}
        />
      ))}
    </aside>
  )
}
