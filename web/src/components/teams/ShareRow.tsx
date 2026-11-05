/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions -- the bar is a labelled group of focusable image segments whose focus drives the tooltip; fieldset/img cannot lay out or name them this way */
import { useState } from 'react'
import type { ShareRowModel } from './shareModel'
import styles from './ShareRow.module.css'

interface Props {
  row: ShareRowModel
}

/** One stacked 100% bar: label and total, segments, and the leader line. */
export function ShareRow({ row }: Props) {
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const focused = row.segments.find((s) => s.id === focusedId)

  return (
    <div className={styles.row}>
      <div className={styles.label}>
        <span className={styles.name}>{row.label}</span>
        <span className={styles.total}>{row.totalText}</span>
      </div>
      <div className={styles.barWrap}>
        {focused && (
          <span role="tooltip" className={styles.tooltip}>
            {focused.tooltip}
          </span>
        )}
        <div role="group" aria-label={row.barLabel} className={styles.track}>
          {row.segments.map((s) => (
            <span
              key={s.id}
              tabIndex={0}
              role="img"
              aria-label={s.tooltip}
              title={s.tooltip}
              className={styles.segment}
              style={{ flexGrow: s.value, background: s.color, color: s.textColor }}
              onFocus={() => setFocusedId(s.id)}
              onBlur={() => setFocusedId((cur) => (cur === s.id ? null : cur))}
            >
              {s.text !== null && <span aria-hidden="true">{s.text}</span>}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.leader}>{row.leaderText}</div>
    </div>
  )
}
