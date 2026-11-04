import { useId } from 'react'
import type { SummaryStat } from './teamHeaderModel'
import styles from './TeamHeader.module.css'

interface Props {
  badge: string
  name: string
  meta: string
  summary: readonly SummaryStat[]
}

/** Header card for one team: badge, name, meta line and summary stats. */
export function TeamHeader({ badge, name, meta, summary }: Props) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={styles.card}>
      <div className={styles.identity}>
        <span className={styles.badge}>{badge}</span>
        <div className={styles.text}>
          <h2 id={headingId} className={styles.name}>
            {name}
          </h2>
          <p className={styles.meta}>{meta}</p>
        </div>
      </div>
      {summary.length > 0 && (
        <dl className={styles.summary}>
          {summary.map((s) => (
            <div key={s.key} className={styles.stat}>
              <dt className={styles.label}>{s.label}</dt>
              <dd className={styles.value}>{s.text}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
