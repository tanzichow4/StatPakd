/* oxlint-disable jsx-a11y/no-redundant-roles, jsx-a11y/prefer-tag-over-role -- list-style:none strips list semantics in Safari, so the role is explicit; fieldset/details are form/disclosure elements, not labelled groups */
import { useId, useMemo } from 'react'
import type { Entity, StatDef } from '../../domain/types'
import { cx } from '../../lib/cx'
import { NULL_PLACEHOLDER } from '../../lib/stats'
import { seriesColor } from '../../styles/series'
import { barRows } from './barsModel'
import type { CompareColumn } from './tableModel'
import styles from './BarsChart.module.css'

interface Props {
  columns: CompareColumn[]
  rows: StatDef[]
  pool: readonly Entity[]
}

export function BarsChart({ columns, rows, pool }: Props) {
  const baseId = useId()
  const barData = useMemo(() => barRows(rows, columns, pool), [rows, columns, pool])

  return (
    <div role="group" aria-label="Bars chart" className={styles.chart}>
      {barData.map(({ def, lines }) => {
        const labelId = `${baseId}-${def.key}-label`
        const noteId = `${baseId}-${def.key}-note`
        return (
          <div
            key={def.key}
            role="group"
            aria-labelledby={def.lowerIsBetter ? `${labelId} ${noteId}` : labelId}
            className={styles.row}
          >
            <div className={styles.head}>
              <span id={labelId} className={styles.label}>
                {def.label}
              </span>
              {def.lowerIsBetter && (
                <span id={noteId} className={styles.note}>
                  lower is better
                </span>
              )}
            </div>
            <ul role="list" className={styles.bars}>
              {lines.map(({ entity, colorIndex, text, width, na }) => (
                <li key={entity.id} className={styles.line}>
                  <span className={styles.name}>
                    <span
                      aria-hidden="true"
                      className={styles.swatch}
                      style={{ background: seriesColor(colorIndex) }}
                    />
                    <span className={styles.nameText}>{entity.shortName}</span>
                  </span>
                  <span aria-hidden="true" className={styles.track} data-testid="bar-track">
                    {!na && (
                      <span
                        className={styles.fill}
                        data-testid="bar-fill"
                        style={{ width: `${width}%`, background: seriesColor(colorIndex) }}
                      />
                    )}
                  </span>
                  <span className={styles.srOnly}>: </span>
                  {na ? (
                    <>
                      <span aria-hidden="true" className={cx(styles.value, styles.na)}>
                        {NULL_PLACEHOLDER}
                      </span>
                      <span className={styles.srOnly}>not applicable</span>
                    </>
                  ) : (
                    <span className={styles.value}>{text}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      <p className={styles.caption}>Bar length scaled to league range.</p>
    </div>
  )
}
