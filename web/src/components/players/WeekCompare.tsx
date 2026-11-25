import { useId } from 'react'
import type { GameLogEntry, StatDef } from '../../domain/types'
import { CompareTable } from '../compare/CompareTable'
import { Chip } from '../ui'
import {
  RECENT_COUNT,
  changeText,
  chosenEntries,
  describeTrend,
  periodColumns,
  recentPeriods,
  trendChart,
  trendPoints,
} from './playerModel'
import { TrendChart } from './TrendChart'
import styles from './PlayerDetail.module.css'

interface Props {
  log: readonly GameLogEntry[]
  defs: StatDef[]
  chosen: readonly number[]
  onToggle: (period: number) => void
  onChoose: (periods: number[]) => void
}

/** Chosen periods side by side: a dot plot with its trend for each stat, then a table. */
export function WeekCompare({ log, defs, chosen, onToggle, onChoose }: Props) {
  const headingId = useId()
  const entries = chosenEntries(log, chosen)
  const played = log.filter((e) => e.played)

  return (
    <section aria-labelledby={headingId} className={styles.section}>
      <h3 id={headingId} className={styles.heading}>
        Compare weeks
      </h3>
      <fieldset className={styles.chips} aria-label="Weeks to compare">
        {played.map((e) => (
          <Chip
            key={e.period}
            mono
            active={chosen.includes(e.period)}
            onClick={() => onToggle(e.period)}
          >
            <span aria-hidden="true">{e.shortLabel}</span>
            <span className={styles.srOnly}>{e.label}</span>
          </Chip>
        ))}
      </fieldset>
      <div className={styles.shortcuts}>
        <button
          type="button"
          className={styles.shortcut}
          onClick={() => onChoose(recentPeriods(log))}
        >
          Last {RECENT_COUNT}
        </button>
        <button
          type="button"
          className={styles.shortcut}
          onClick={() => onChoose(played.map((e) => e.period))}
        >
          All
        </button>
        <button type="button" className={styles.shortcut} onClick={() => onChoose([])}>
          Clear
        </button>
      </div>
      {entries.length < 2 ? (
        <p className={styles.hint}>Pick at least 2 weeks to compare.</p>
      ) : (
        <>
          <div className={styles.grid}>
            {defs.map((def) => {
              const trend = describeTrend(trendPoints(entries, def.key), def)
              const change = changeText(entries, def)
              return (
                <div key={def.key} className={styles.card}>
                  <h4 className={styles.cardTitle}>
                    {def.label}
                    {def.lowerIsBetter && <span className={styles.note}>lower is better</span>}
                  </h4>
                  <p className={styles.trendText} data-testid="week-trend">
                    {[change, trend?.text].filter(Boolean).join(' · ') || 'Not enough values'}
                  </p>
                  <TrendChart
                    label={`${def.label} across the chosen weeks`}
                    model={trendChart(entries, def)}
                    showLines
                    connect
                    showValues={entries.length <= 6}
                  />
                </div>
              )
            })}
          </div>
          <p className={styles.legend}>
            Black line joins the weeks · red line = trend · dashed line = average of the chosen
            weeks
          </p>
          <CompareTable
            columns={periodColumns(entries)}
            rows={defs}
            label="Chosen weeks compared by stat"
            dots={false}
            caption="Black = best of the chosen weeks · — = no value"
          />
        </>
      )}
    </section>
  )
}
