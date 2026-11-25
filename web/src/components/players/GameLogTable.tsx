import type { GameLogEntry, StatDef } from '../../domain/types'
import { cx } from '../../lib/cx'
import { formatStat, NULL_PLACEHOLDER } from '../../lib/stats'
import { Checkbox } from '../ui'
import styles from './GameLogTable.module.css'

interface Props {
  log: readonly GameLogEntry[]
  defs: readonly StatDef[]
  chosen: readonly number[]
  onToggle: (period: number) => void
}

/** Every period of the season, one row each; ticking a row adds it to the comparison. */
export function GameLogTable({ log, defs, chosen, onToggle }: Props) {
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- WCAG 2.1.1: scrollable region must be keyboard focusable
    <section aria-label="Game log table" tabIndex={0} className={styles.scroll}>
      <table aria-label="Game log" className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={styles.periodHead}>
              Week
            </th>
            {defs.map((d) => (
              <th key={d.key} scope="col" className={styles.head}>
                {d.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {log.map((entry) => (
            <tr key={entry.period} className={cx(chosen.includes(entry.period) && styles.chosen)}>
              <th scope="row" className={styles.period}>
                {entry.played ? (
                  <Checkbox
                    label={entry.label}
                    checked={chosen.includes(entry.period)}
                    onChange={() => onToggle(entry.period)}
                    className={styles.check}
                  />
                ) : (
                  <span className={styles.rest}>{entry.label}</span>
                )}
              </th>
              {entry.played ? (
                defs.map((d) => {
                  const value = entry.stats[d.key]
                  return (
                    <td key={d.key} className={styles.cell}>
                      {value == null ? (
                        <>
                          <span aria-hidden="true" className={styles.na}>
                            {NULL_PLACEHOLDER}
                          </span>
                          <span className={styles.srOnly}>not applicable</span>
                        </>
                      ) : (
                        formatStat(value, d)
                      )}
                    </td>
                  )
                })
              ) : (
                <td colSpan={defs.length} className={styles.bye}>
                  Bye
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
