/* oxlint-disable jsx-a11y/no-redundant-roles, jsx-a11y/prefer-tag-over-role -- list-style:none strips list semantics in Safari, so the role is explicit */
import type { CSSProperties } from 'react'
import type { EntityKind } from '../../domain/types'
import { seriesColor } from '../../styles/series'
import type { ReadoutCard } from './chart3dModel'
import { EmptyState } from './EmptyState'
import styles from './Readout.module.css'

interface Props {
  cards: readonly ReadoutCard[]
  kind: EntityKind
}

export function Readout({ cards, kind }: Props) {
  return (
    <aside className={styles.root}>
      <h2 className={styles.heading}>Readout</h2>
      {cards.length === 0 ? (
        <EmptyState kind={kind} />
      ) : (
        <ul role="list" className={styles.list}>
          {cards.map(({ entity, colorIndex, cells }) => (
            <li key={entity.id} className={styles.card}>
              <div className={styles.head}>
                <span
                  className={styles.swatch}
                  style={{ '--series': seriesColor(colorIndex) } as CSSProperties}
                  data-testid="readout-swatch"
                />
                <span className={styles.name}>{entity.name}</span>
              </div>
              <div className={styles.cells}>
                {cells.map((c) => (
                  <div key={c.letter} className={styles.cell}>
                    <span className={styles.letter}>{c.letter}</span>{' '}
                    <span className={styles.value}>{c.text}</span>{' '}
                    <span className={styles.label}>{c.label}</span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
