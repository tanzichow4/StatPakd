/* oxlint-disable jsx-a11y/prefer-tag-over-role -- fieldset is a form element, not a chart group */
import { cx } from '../../lib/cx'
import type { TrendChartModel } from './playerModel'
import styles from './TrendChart.module.css'

interface Props {
  /** Accessible name of the chart. */
  label: string
  model: TrendChartModel
  /** Draw the season average and the fitted trend line. */
  showLines?: boolean
  /** Join the dots in order. */
  connect?: boolean
  /** Print each value above its dot. */
  showValues?: boolean
  /** Periods drawn as chosen. */
  chosen?: readonly number[]
  /** When given, each period is a button that toggles it. */
  onToggle?: (period: number) => void
}

/** Dot plot of one stat over the periods of a season. */
export function TrendChart({
  label,
  model,
  showLines,
  connect,
  showValues,
  chosen = [],
  onToggle,
}: Props) {
  const { columns, ticks, average, trend } = model
  const grid = { gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }
  const path = columns
    .filter((c) => c.y !== null)
    .map((c) => `${c.x},${c.y}`)
    .join(' ')

  return (
    <div role="group" aria-label={label} className={styles.chart}>
      <div aria-hidden="true" className={styles.yAxis}>
        <div className={styles.scale}>
          {ticks.map((t) => (
            <span key={t.y} className={styles.yTick} style={{ top: `${t.y}%` }}>
              {t.text}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.plot}>
        <div className={styles.scale}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className={styles.svg}
            aria-hidden="true"
            focusable="false"
          >
            {ticks.map((t) => (
              <line key={t.y} x1="0" x2="100" y1={t.y} y2={t.y} className={styles.gridLine} />
            ))}
            {connect && <polyline points={path} className={styles.path} data-testid="path" />}
            {showLines && average && (
              <line
                x1="0"
                x2="100"
                y1={average.y}
                y2={average.y}
                className={styles.average}
                data-testid="average-line"
              />
            )}
            {showLines && trend && (
              <line {...trend} className={styles.trend} data-testid="trend-line" />
            )}
          </svg>
          <div className={styles.columns} style={grid}>
            {columns.map((c) => {
              const spoken = `${c.label}: ${!c.played ? 'bye' : c.y === null ? 'not applicable' : c.text}`
              const picked = chosen.includes(c.period)
              const mark = (
                <>
                  {!c.played && (
                    <span aria-hidden="true" className={styles.bye}>
                      Bye
                    </span>
                  )}
                  {c.y !== null && (
                    <span
                      aria-hidden="true"
                      className={cx(styles.dot, picked && styles.picked)}
                      data-testid="trend-dot"
                      style={{ top: `${c.y}%` }}
                    >
                      {showValues && <span className={styles.value}>{c.text}</span>}
                    </span>
                  )}
                </>
              )
              return onToggle && c.played ? (
                <button
                  key={c.period}
                  type="button"
                  className={cx(styles.column, styles.button)}
                  aria-label={spoken}
                  aria-pressed={picked}
                  title={spoken}
                  onClick={() => onToggle(c.period)}
                >
                  {mark}
                </button>
              ) : (
                <span key={c.period} className={styles.column} title={spoken}>
                  <span className={styles.srOnly}>{spoken}</span>
                  {mark}
                </span>
              )
            })}
          </div>
        </div>
      </div>
      <div aria-hidden="true" className={styles.xAxis} style={grid}>
        {columns.map((c) => (
          <span key={c.period} className={styles.xTick}>
            {/* Numbers alone when the short labels would not fit. */}
            {columns.length > 8 ? c.period : c.shortLabel}
          </span>
        ))}
      </div>
    </div>
  )
}
