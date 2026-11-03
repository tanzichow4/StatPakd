import type { Ref } from 'react'
import type { Entity } from '../../domain/types'
import { seriesColor } from '../../styles/series'
import styles from './EntityCard.module.css'

export interface EntityCardProps {
  entity: Entity
  colorIndex: number
  onRemove: () => void
  removeRef?: Ref<HTMLButtonElement>
}

export function EntityCard({ entity, colorIndex, onRemove, removeRef }: EntityCardProps) {
  return (
    <li className={styles.card} style={{ borderTopColor: seriesColor(colorIndex) }}>
      <div className={styles.top}>
        <span className={styles.badge}>{entity.badge}</span>
        <button
          type="button"
          ref={removeRef}
          className={styles.remove}
          aria-label={`Remove ${entity.name}`}
          onClick={onRemove}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <div className={styles.text}>
        <span className={styles.name}>{entity.name}</span>
        <span className={styles.meta}>{entity.meta}</span>
      </div>
    </li>
  )
}
