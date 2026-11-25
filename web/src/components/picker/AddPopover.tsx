import { useEffect, useRef } from 'react'
import type { Entity, EntityId, EntityKind } from '../../domain/types'
import { kindSingular } from './filterEntities'
import styles from './AddPopover.module.css'

/** Most results listed at once; searching narrows the rest. */
export const RESULT_LIMIT = 50

export interface AddPopoverProps {
  id: string
  kind: EntityKind
  results: Entity[]
  /** Position chips, or null when the kind has none. */
  chips: string[] | null
  q: string
  pos: string
  selectedIds: EntityId[]
  full: boolean
  onQuery: (q: string) => void
  onPos: (pos: string) => void
  onToggleEntity: (id: EntityId) => void
  onDone: () => void
  onEscape: () => void
  shiftLeft?: number
}

export function AddPopover({
  id,
  kind,
  results,
  chips,
  q,
  pos,
  selectedIds,
  full,
  onQuery,
  onPos,
  onToggleEntity,
  onDone,
  onEscape,
  shiftLeft = 0,
}: AddPopoverProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const singular = kindSingular(kind)

  const rootRef = useRef<HTMLDialogElement>(null)
  const onEscapeRef = useRef(onEscape)

  useEffect(() => {
    onEscapeRef.current = onEscape
  })

  useEffect(() => {
    inputRef.current?.focus()
    const root = rootRef.current
    if (!root) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onEscapeRef.current()
    }
    root.addEventListener('keydown', handleKeyDown)
    return () => root.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <dialog
      ref={rootRef}
      open
      id={id}
      className={styles.popover}
      aria-label={`Add ${singular}`}
      style={shiftLeft > 0 ? { left: -shiftLeft } : undefined}
    >
      <div className={styles.top}>
        <input
          ref={inputRef}
          type="search"
          className={styles.search}
          aria-label={`Search ${singular}s`}
          placeholder={kind === 'players' ? 'Search players or team' : 'Search teams'}
          value={q}
          onChange={(event) => onQuery(event.target.value)}
        />
        <button type="button" className={styles.done} onClick={onDone}>
          Done
        </button>
      </div>
      {chips !== null && (
        <fieldset className={styles.chips} aria-label="Filter by position">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              className={styles.chip}
              aria-pressed={chip === pos}
              onClick={() => onPos(chip)}
            >
              {chip}
            </button>
          ))}
        </fieldset>
      )}
      {results.length === 0 ? (
        <p className={styles.empty}>No matches.</p>
      ) : (
        <ul className={styles.results} aria-label="Results">
          {results.slice(0, RESULT_LIMIT).map((entity) => {
            const selected = selectedIds.includes(entity.id)
            const verb = selected ? 'Remove' : 'Add'
            return (
              <li key={entity.id} className={styles.row}>
                <span className={styles.tile} aria-hidden="true">
                  {entity.badge}
                </span>
                <span className={styles.text}>
                  <span className={styles.name}>{entity.name}</span>
                  <span className={styles.meta}>{entity.meta}</span>
                </span>
                <button
                  type="button"
                  className={selected ? styles.ctaRemove : styles.ctaAdd}
                  aria-label={`${verb} ${entity.name}`}
                  disabled={!selected && full}
                  onClick={() => onToggleEntity(entity.id)}
                >
                  {verb}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {results.length > RESULT_LIMIT && (
        <p className={styles.empty}>
          Showing {RESULT_LIMIT} of {results.length}. Search to find others.
        </p>
      )}
    </dialog>
  )
}
