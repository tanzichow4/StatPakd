import { useId } from 'react'
import { cx } from '../../lib/cx'
import { bestIndex, formatStat, NULL_PLACEHOLDER } from '../../lib/stats'
import { seriesColor } from '../../styles/series'
import type { CompareColumn } from '../compare/tableModel'
import { Pill } from '../ui'
import type { StatGroupTotals } from './weekModel'
import styles from './TotalsPanel.module.css'

interface Props {
  columns: readonly CompareColumn[]
  groups: readonly StatGroupTotals[]
  weekCount: number
  /** Stat drawn up the y axis of the graph. */
  graphed: string
  onGraph: (key: string) => void
}

/** Totals for the chosen weeks by category. Choosing a stat graphs it. */
export function TotalsPanel({ columns, groups, weekCount, graphed, onGraph }: Props) {
  const headingId = useId()
  const many = columns.length > 1

  return (
    <aside aria-labelledby={headingId} className={cx(styles.panel, many && styles.many)}>
      <h2 id={headingId} className={styles.heading}>
        Totals
      </h2>
      <p className={styles.sub}>
        {weekCount} {weekCount === 1 ? 'week' : 'weeks'} chosen · pick a stat to graph it
      </p>
      {groups.map(({ group, rows }) => (
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- WCAG 2.1.1: scrollable region must be keyboard focusable
        <section key={group} aria-label={`${group} totals`} tabIndex={0} className={styles.group}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col" className={styles.groupName}>
                  {group}
                </th>
                {columns.map(({ entity, colorIndex }) => (
                  <th key={entity.id} scope="col" className={styles.player}>
                    {many ? (
                      <>
                        <span
                          aria-hidden="true"
                          className={styles.swatch}
                          style={{ background: seriesColor(colorIndex) }}
                        />
                        {entity.shortName}
                      </>
                    ) : (
                      <span className={styles.srOnly}>{entity.shortName}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ def, values }) => {
                // With one player there is nobody to be better than.
                const best = many ? bestIndex(values, def) : []
                return (
                  <tr key={def.key} className={cx(def.key === graphed && styles.graphed)}>
                    <th scope="row" className={styles.stat}>
                      <button
                        type="button"
                        className={styles.pick}
                        aria-pressed={def.key === graphed}
                        onClick={() => onGraph(def.key)}
                      >
                        {def.label}
                      </button>
                      {def.rollup?.kind === 'average' && <span className={styles.note}>avg</span>}
                    </th>
                    {values.map((value, i) => (
                      <td key={columns[i].entity.id} className={styles.value}>
                        {value == null ? (
                          <>
                            <span aria-hidden="true">{NULL_PLACEHOLDER}</span>
                            <span className={styles.srOnly}>not applicable</span>
                          </>
                        ) : best.includes(i) ? (
                          <>
                            <Pill>{formatStat(value, def)}</Pill>
                            <span className={styles.srOnly}> (best)</span>
                          </>
                        ) : (
                          formatStat(value, def)
                        )}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      ))}
    </aside>
  )
}
