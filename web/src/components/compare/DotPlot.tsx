/* oxlint-disable jsx-a11y/no-redundant-roles, jsx-a11y/prefer-tag-over-role -- list-style:none strips list semantics in Safari, so the role is explicit; fieldset/details are form/disclosure elements, not labelled groups */
import { useId, useMemo } from 'react'
import type { Entity, StatDef } from '../../domain/types'
import { cx } from '../../lib/cx'
import { NULL_PLACEHOLDER } from '../../lib/stats'
import { seriesColor } from '../../styles/series'
import { Pill } from '../ui'
import { dotRows } from './dotsModel'
import type { CompareColumn } from './tableModel'
import styles from './DotPlot.module.css'

interface Props {
  columns: CompareColumn[]
  rows: StatDef[]
  pool: readonly Entity[]
}

/** Vertical distance between stacked dots, in pixels. */
const LANE_PX = 11

export function DotPlot({ columns, rows, pool }: Props) {
  const baseId = useId()
  const data = useMemo(() => dotRows(rows, columns, pool), [rows, columns, pool])

  return (
    <div role="group" aria-label="Dot plot" className={styles.chart}>
      {data.map(({ def, minText, maxText, marks, league, spread }) => {
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
            <div className={styles.body}>
              <div
                aria-hidden="true"
                className={styles.plot}
                style={{ height: 28 + spread * LANE_PX * 2 }}
              >
                <div className={styles.scale}>
                  <span className={styles.line} />
                  {league.map((d) => (
                    <span
                      key={d.id}
                      className={styles.leagueDot}
                      data-testid="league-dot"
                      style={{ left: `${d.x}%` }}
                    />
                  ))}
                  {marks
                    .filter((m) => !m.na)
                    .map((m) => (
                      <span
                        key={m.entity.id}
                        className={styles.dot}
                        data-testid="dot"
                        title={`${m.entity.name}: ${m.text}`}
                        style={{
                          left: `${m.x}%`,
                          marginTop: m.offset * LANE_PX,
                          background: seriesColor(m.colorIndex),
                        }}
                      />
                    ))}
                </div>
              </div>
              <div aria-hidden="true" className={styles.ends}>
                <span data-testid="scale-min">{minText}</span>
                <span data-testid="scale-max">{maxText}</span>
              </div>
              <ul role="list" className={styles.values}>
                {marks.map((m) => (
                  <li key={m.entity.id} className={styles.item}>
                    <span
                      aria-hidden="true"
                      className={styles.swatch}
                      style={{ background: seriesColor(m.colorIndex) }}
                    />
                    <span>{m.entity.shortName}</span>
                    <span className={styles.srOnly}>: </span>
                    {m.na ? (
                      <>
                        <span aria-hidden="true" className={cx(styles.value, styles.na)}>
                          {NULL_PLACEHOLDER}
                        </span>
                        <span className={styles.srOnly}>not applicable</span>
                      </>
                    ) : m.best ? (
                      <>
                        <span className={styles.value}>
                          <Pill>{m.text}</Pill>
                        </span>
                        <span className={styles.srOnly}> (best)</span>
                      </>
                    ) : (
                      <span className={styles.value}>{m.text}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )
      })}
      <p className={styles.caption}>
        Each scale runs from the league lowest to highest · small gray dots = rest of league · black
        = best among selected
      </p>
    </div>
  )
}
