/* oxlint-disable jsx-a11y/prefer-tag-over-role -- fieldset is a form element, not a chart group */
import { cx } from '../../lib/cx'
import type { GraphModel } from './graphModel'
import styles from './DotGraph.module.css'

interface Props {
  /** Accessible name of the graph. */
  label: string
  model: GraphModel
  /** The y ticks are row names instead of numbers, so they need more room. */
  rows?: boolean
}

/** Dots on an x and y axis, with optional trend lines. Every dot is also listed as text. */
export function DotGraph({ label, model, rows }: Props) {
  const { xTitle, yTitle, xTicks, yTicks, points, lines } = model
  // Long runs of tick labels drop every other one on narrow screens.
  const crowded = xTicks.length > 9

  return (
    <div role="group" aria-label={label} className={cx(styles.graph, rows && styles.rows)}>
      <p aria-hidden="true" className={styles.yTitle} data-testid="y-title">
        {yTitle}
      </p>
      <div aria-hidden="true" className={styles.yAxis}>
        <div className={styles.scale}>
          {yTicks.map((t) => (
            <span
              key={`${t.at}${t.label}`}
              className={styles.yTick}
              data-testid="y-tick"
              style={{ top: `${t.at}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>
      <div aria-hidden="true" className={styles.plot}>
        <div className={styles.scale}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className={styles.svg}
            focusable="false"
          >
            {yTicks.map((t) => (
              <line key={`y${t.at}`} x1="0" x2="100" y1={t.at} y2={t.at} className={styles.grid} />
            ))}
            {!crowded &&
              xTicks.map((t) => (
                <line
                  key={`x${t.at}`}
                  x1={t.at}
                  x2={t.at}
                  y1="0"
                  y2="100"
                  className={styles.grid}
                />
              ))}
            <line x1="0" x2="0" y1="0" y2="100" className={styles.axis} />
            <line x1="0" x2="100" y1="100" y2="100" className={styles.axis} />
            {lines.map(({ id, color, ...ends }) => (
              <line
                key={id}
                {...ends}
                className={styles.trend}
                style={{ stroke: color }}
                data-testid="trend-line"
              />
            ))}
          </svg>
          {points.map((p) => (
            <span
              key={p.id}
              className={cx(styles.dot, p.muted && styles.muted)}
              data-testid={p.muted ? 'league-dot' : 'dot'}
              title={p.description}
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                background: p.muted ? undefined : p.color,
              }}
            >
              {p.text && (
                <span className={cx(styles.text, p.x > 75 && styles.textLeft)}>{p.text}</span>
              )}
            </span>
          ))}
        </div>
      </div>
      <div aria-hidden="true" className={cx(styles.xAxis, crowded && styles.crowded)}>
        <div className={styles.xScale}>
          {xTicks.map((t) => (
            <span
              key={`${t.at}${t.label}`}
              className={styles.xTick}
              data-testid="x-tick"
              style={{ left: `${t.at}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>
      <p aria-hidden="true" className={styles.xTitle} data-testid="x-title">
        {xTitle}
      </p>
      <ul className={styles.srOnly}>
        {points
          .filter((p) => !p.muted)
          .map((p) => (
            <li key={p.id}>{p.description}</li>
          ))}
      </ul>
    </div>
  )
}
