import { useEffect, useRef } from 'react'
import { Checkbox } from '../ui/Checkbox'
import { AddStatMenu } from './AddStatMenu'
import type { StatGroupModel } from './groupStats'
import styles from './StatGroup.module.css'

interface Props {
  group: StatGroupModel
  locked: boolean
  open: boolean
  menuId: string
  headingId: string
  onDeselect: (key: string, rowIndex: number) => void
  onToggleMenu: () => void
  onPick: (key: string) => void
  onClose: (reason: 'escape' | 'outside') => void
  checkboxRef: (key: string, node: HTMLInputElement | null) => void
  addButtonRef: (node: HTMLButtonElement | null) => void
}

export function StatGroup({
  group,
  locked,
  open,
  menuId,
  headingId,
  onDeselect,
  onToggleMenu,
  onPick,
  onClose,
  checkboxRef,
  addButtonRef,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (wrapperRef.current?.contains(event.target as Node)) return
      onCloseRef.current('outside')
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      event.preventDefault()
      onCloseRef.current('escape')
    }
    const wrapper = wrapperRef.current
    document.addEventListener('pointerdown', onPointerDown, true)
    wrapper?.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      wrapper?.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <fieldset aria-labelledby={headingId} className={styles.group}>
      <h2 id={headingId} className={styles.heading}>
        {group.name}
      </h2>
      {group.selected.length > 0 && (
        <ul className={styles.list}>
          {group.selected.map((def, rowIndex) => (
            <li key={def.key}>
              <Checkbox
                label={def.label}
                checked
                className={styles.row}
                locked={locked}
                inputRef={(node) => checkboxRef(def.key, node)}
                onChange={() => onDeselect(def.key, rowIndex)}
              />
            </li>
          ))}
        </ul>
      )}
      {group.unselected.length > 0 && (
        <div ref={wrapperRef}>
          <button
            ref={addButtonRef}
            type="button"
            className={styles.add}
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            aria-label={`Add stat to ${group.name}`}
            onClick={onToggleMenu}
          >
            <span className={styles.addIcon} aria-hidden="true">
              +
            </span>
            Add stat
          </button>
          {open && (
            <AddStatMenu
              id={menuId}
              groupName={group.name}
              items={group.unselected}
              onPick={onPick}
            />
          )}
        </div>
      )}
    </fieldset>
  )
}
