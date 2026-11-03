import type { KeyboardEvent, Ref } from 'react'
import type { EntityKind } from '../../domain/types'
import { MAX_SELECTED } from '../../state'
import { kindSingular } from './filterEntities'
import styles from './AddCard.module.css'

export interface AddCardProps {
  kind: EntityKind
  selectedCount: number
  expanded: boolean
  popoverId: string
  onToggle: () => void
  onEscape: () => void
  buttonRef?: Ref<HTMLButtonElement>
}

export function AddCard({
  kind,
  selectedCount,
  expanded,
  popoverId,
  onToggle,
  onEscape,
  buttonRef,
}: AddCardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape' && expanded) onEscape()
  }
  return (
    <button
      type="button"
      ref={buttonRef}
      className={styles.card}
      aria-expanded={expanded}
      aria-haspopup="dialog"
      aria-controls={expanded ? popoverId : undefined}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
    >
      <span className={styles.plus} aria-hidden="true">
        +
      </span>
      <span className={styles.label}>Add {kindSingular(kind)}</span>
      <span className={styles.slots}>
        {MAX_SELECTED - selectedCount} of {MAX_SELECTED} slots open
      </span>
    </button>
  )
}
