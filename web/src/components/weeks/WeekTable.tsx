import type { ReactNode } from 'react'
import type { StatDef, StatValue } from '../../domain/types'
import { bestIndex, formatStat, NULL_PLACEHOLDER } from '../../lib/stats'
import { seriesColor } from '../../styles/series'
import type { CompareColumn } from '../compare/tableModel'
import { Pill } from '../ui'
import { periodTotal, playedEntry, type GameLogs, type Period } from './weekModel'
import styles from './WeekTable.module.css'

function Value({
  value,
  def,
  best,
}: {
  value: StatValue | undefined
  def: StatDef
  best?: boolean
}) {
  if (value == null) {
    return (
      <>
        <span aria-hidden="true">{NULL_PLACEHOLDER}</span>
        <span className={styles.srOnly}>not applicable</span>
      </>
    )
  }
  if (!best) return formatStat(value, def)
  return (
    <>
      <Pill>{formatStat(value, def)}</Pill>
      <span className={styles.srOnly}> (best)</span>
    </>
  )
}

function Frame({ name, children }: { name: string; children: ReactNode }) {
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- WCAG 2.1.1: scrollable region must be keyboard focusable
    <section aria-label={`${name} table`} tabIndex={0} className={styles.scroll}>
      <table aria-label={name} className={styles.table}>
        {children}
      </table>
    </section>
  )
}

interface PlayerProps {
  column: CompareColumn
  logs: GameLogs
  defs: readonly StatDef[]
  periods: readonly Period[]
}

/** One player: a row for each chosen week with every stat, then the totals. */
export function PlayerWeekTable({ column, logs, defs, periods }: PlayerProps) {
  const { id, name } = column.entity
  return (
    <Frame name={`${name} week by week`}>
      <thead>
        <tr>
          <th scope="col" className={styles.weekHead}>
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
        {periods.map((p) => {
          const entry = playedEntry(logs, id, p.period)
          return (
            <tr key={p.period}>
              <th scope="row" className={styles.week}>
                {p.label}
              </th>
              {entry ? (
                defs.map((d) => (
                  <td key={d.key} className={styles.cell}>
                    <Value value={entry.stats[d.key]} def={d} />
                  </td>
                ))
              ) : (
                <td colSpan={defs.length} className={styles.bye}>
                  Bye
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" className={styles.week}>
            Total
          </th>
          {defs.map((d) => (
            <td key={d.key} className={styles.cell}>
              <Value value={periodTotal(logs, id, d, periods)} def={d} />
            </td>
          ))}
        </tr>
      </tfoot>
    </Frame>
  )
}

interface CompareProps {
  columns: readonly CompareColumn[]
  logs: GameLogs
  def: StatDef
  periods: readonly Period[]
}

/** Several players: a row for each chosen week comparing one stat, then the totals. */
export function StatWeekTable({ columns, logs, def, periods }: CompareProps) {
  const row = (values: (StatValue | undefined)[]) => {
    const best = bestIndex(values, def)
    return values.map((value, i) => (
      <td key={columns[i].entity.id} className={styles.cell}>
        <Value value={value} def={def} best={best.includes(i)} />
      </td>
    ))
  }
  return (
    <Frame name={`${def.label} by week and player`}>
      <caption className={styles.caption}>
        {def.label} · black = best of the week{def.lowerIsBetter ? ' (lower is better)' : ''}
      </caption>
      <thead>
        <tr>
          <th scope="col" className={styles.weekHead}>
            Week
          </th>
          {columns.map(({ entity, colorIndex }) => (
            <th key={entity.id} scope="col" className={styles.head}>
              <span
                aria-hidden="true"
                className={styles.swatch}
                style={{ background: seriesColor(colorIndex) }}
              />
              {entity.shortName}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {periods.map((p) => {
          const entries = columns.map((c) => playedEntry(logs, c.entity.id, p.period))
          const best = bestIndex(
            entries.map((e) => e?.stats[def.key]),
            def,
          )
          return (
            <tr key={p.period}>
              <th scope="row" className={styles.week}>
                {p.label}
              </th>
              {entries.map((entry, i) => (
                <td key={columns[i].entity.id} className={styles.cell}>
                  {entry ? (
                    <Value value={entry.stats[def.key]} def={def} best={best.includes(i)} />
                  ) : (
                    'Bye'
                  )}
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" className={styles.week}>
            Total
          </th>
          {row(columns.map((c) => periodTotal(logs, c.entity.id, def, periods)))}
        </tr>
      </tfoot>
    </Frame>
  )
}
