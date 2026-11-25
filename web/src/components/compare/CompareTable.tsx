/* oxlint-disable jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role -- display:grid/block strips native table roles in some browsers, so roles are explicit */
import type { CSSProperties } from 'react'
import type { EntityKind, StatDef } from '../../domain/types'
import { cx } from '../../lib/cx'
import { bestIndex, formatStat, NULL_PLACEHOLDER } from '../../lib/stats'
import { seriesColor } from '../../styles/series'
import { Pill } from '../ui'
import {
  COMPACT_HEADER_MIN,
  gridColumns,
  headerLines,
  tableMinWidth,
  type CompareColumn,
} from './tableModel'
import styles from './CompareTable.module.css'

interface Props {
  kind: EntityKind
  columns: CompareColumn[]
  rows: StatDef[]
}

export function CompareTable({ kind, columns, rows }: Props) {
  const n = columns.length
  const compact = n >= COMPACT_HEADER_MIN
  const rowStyle: CSSProperties = { gridTemplateColumns: gridColumns(n) }

  return (
    <div className={styles.wrap}>
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- WCAG 2.1.1: scrollable region must be keyboard focusable */}
      <section aria-label="Comparison table" tabIndex={0} className={styles.scroll}>
        <table
          role="table"
          aria-label={`Selected ${kind} compared by stat`}
          className={styles.table}
          style={{ minWidth: tableMinWidth(n) }}
        >
          <thead role="rowgroup" className={styles.head}>
            <tr role="row" className={cx(styles.row, styles.headRow)} style={rowStyle}>
              <th role="columnheader" scope="col" className={styles.statHead}>
                Stat
              </th>
              {columns.map(({ entity, colorIndex }) => {
                const { title, sub } = headerLines(entity, compact)
                return (
                  <th key={entity.id} role="columnheader" scope="col" className={styles.colHead}>
                    <span className={styles.title}>
                      <span
                        aria-hidden="true"
                        className={styles.dot}
                        style={{ background: seriesColor(colorIndex) }}
                      />
                      {title}
                    </span>
                    {sub !== undefined && <span className={styles.sub}>{sub}</span>}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody role="rowgroup" className={styles.body}>
            {rows.map((def) => {
              const values = columns.map((c) => c.entity.stats[def.key])
              const best = bestIndex(values, def)
              return (
                <tr key={def.key} role="row" className={styles.row} style={rowStyle}>
                  <th role="rowheader" scope="row" className={styles.rowHead}>
                    {def.label}
                    {def.lowerIsBetter && <span className={styles.note}>lower is better</span>}
                  </th>
                  {values.map((value, i) => (
                    <td key={columns[i].entity.id} role="cell" className={styles.cell}>
                      {value == null ? (
                        <>
                          <span aria-hidden="true" className={cx(styles.value, styles.na)}>
                            {NULL_PLACEHOLDER}
                          </span>
                          <span className={styles.srOnly}>not applicable</span>
                        </>
                      ) : best.includes(i) ? (
                        <>
                          <span className={styles.value}>
                            <Pill>{formatStat(value, def)}</Pill>
                          </span>
                          <span className={styles.srOnly}> (best)</span>
                        </>
                      ) : (
                        <span className={cx(styles.value, styles.plain)}>
                          {formatStat(value, def)}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
      <p className={styles.caption}>Black = best among selected · — = not applicable to position</p>
    </div>
  )
}
