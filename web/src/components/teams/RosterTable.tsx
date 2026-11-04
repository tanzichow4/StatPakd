/* oxlint-disable jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role, jsx-a11y/prefer-tag-over-role, jsx-a11y/control-has-associated-label -- display:grid/block strips native table roles in some browsers, so roles are explicit */
import type { CSSProperties } from 'react'
import { cx } from '../../lib/cx'
import { NULL_PLACEHOLDER } from '../../lib/stats'
import type { RosterColumn, RosterRow } from './rosterModel'
import styles from './RosterTable.module.css'

interface Props {
  columns: RosterColumn[]
  rows: RosterRow[]
  labelledBy: string
  describedBy: string
  onSort: (key: string) => void
}

/** Sortable roster table. Presentational: the model and sort state come from the parent. */
export function RosterTable({ columns, rows, labelledBy, describedBy, onSort }: Props) {
  const rowStyle: CSSProperties = {
    gridTemplateColumns: `minmax(220px, 1.6fr) repeat(${columns.length}, minmax(96px, 1fr))`,
  }

  return (
    <div className={styles.frame}>
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- WCAG 2.1.1: scrollable region must be keyboard focusable */}
      <div role="region" aria-label="Roster table" tabIndex={0} className={styles.scroll}>
        <table
          role="table"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          className={styles.table}
          style={{ minWidth: 820 }}
        >
          <thead role="rowgroup" className={styles.head}>
            <tr role="row" className={cx(styles.row, styles.headRow)} style={rowStyle}>
              <th role="columnheader" scope="col" className={styles.playerHead}>
                Player
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  role="columnheader"
                  scope="col"
                  aria-sort={col.ariaSort}
                  className={styles.statHead}
                >
                  <button
                    type="button"
                    className={cx(styles.sortButton, col.arrow ? styles.sorted : styles.unsorted)}
                    onClick={() => onSort(col.key)}
                  >
                    {col.label}
                    {col.arrow && (
                      <span aria-hidden="true" className={styles.arrow}>
                        {col.arrow}
                      </span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody role="rowgroup" className={styles.body}>
            {rows.map((row) => (
              <tr key={row.id} role="row" className={styles.row} style={rowStyle}>
                <th role="rowheader" scope="row" className={styles.rowHead}>
                  <span
                    aria-hidden="true"
                    className={styles.swatch}
                    style={{ background: row.color }}
                  />
                  <span className={styles.player}>
                    <span className={styles.name}>{row.name}</span>
                    <span className={styles.meta}>{row.meta}</span>
                  </span>
                </th>
                {row.cells.map((cell) => (
                  <td key={cell.key} role="cell" className={styles.cell}>
                    {cell.text === NULL_PLACEHOLDER ? (
                      <>
                        <span aria-hidden="true" className={cx(styles.value, styles.na)}>
                          {NULL_PLACEHOLDER}
                        </span>
                        <span className={styles.srOnly}>not applicable</span>
                      </>
                    ) : cell.leader ? (
                      <>
                        <span className={cx(styles.value, styles.leader)}>{cell.text}</span>
                        <span className={styles.srOnly}> team leader</span>
                      </>
                    ) : (
                      <span className={cx(styles.value, styles.plain)}>{cell.text}</span>
                    )}
                    {cell.bar !== null && (
                      <span aria-hidden="true" className={styles.bar}>
                        <span className={styles.fill} style={{ width: `${cell.bar}%` }} />
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
