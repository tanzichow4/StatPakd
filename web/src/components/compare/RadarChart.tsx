/* oxlint-disable jsx-a11y/no-redundant-roles, jsx-a11y/prefer-tag-over-role -- list-style:none strips list semantics in Safari, so the role is explicit */
import { useMemo, type CSSProperties } from 'react'
import type { Entity, StatDef } from '../../domain/types'
import { seriesColor } from '../../styles/series'
import { RADAR, radarModel, type LabelAlign } from './radarModel'
import type { CompareColumn } from './tableModel'
import styles from './RadarChart.module.css'

interface Props {
  columns: CompareColumn[]
  rows: StatDef[]
  pool: readonly Entity[]
}

const TRANSFORM: Record<LabelAlign, string> = {
  middle: 'translate(-50%, -50%)',
  start: 'translate(0, -50%)',
  end: 'translate(-100%, -50%)',
}

function seriesStyle(colorIndex: number): CSSProperties {
  return { '--series': seriesColor(colorIndex) } as CSSProperties
}

export function RadarChart({ columns, rows, pool }: Props) {
  const model = useMemo(() => radarModel(rows, columns, pool), [rows, columns, pool])

  return (
    <div role="group" aria-label="Radar chart" className={styles.root}>
      {model.ok ? (
        <div className={styles.box}>
          <svg
            viewBox={`0 0 ${RADAR.width} ${RADAR.height}`}
            className={styles.svg}
            aria-hidden="true"
            focusable="false"
          >
            {model.rings.map((points, i) => (
              <polygon key={i} points={points} className={styles.ring} />
            ))}
            {model.axes.map(({ def, end }) => (
              <line
                key={def.key}
                x1={RADAR.cx}
                y1={RADAR.cy}
                x2={end.x}
                y2={end.y}
                className={styles.spoke}
              />
            ))}
            {model.series.map((s) => (
              <g key={s.entity.id} style={seriesStyle(s.colorIndex)} data-testid="radar-series">
                <polygon points={s.pointsAttr} className={styles.poly} />
                {s.points.map((p, i) => (
                  <circle
                    key={model.axes[i].def.key}
                    cx={p.x}
                    cy={p.y}
                    r={3.5}
                    className={styles.dot}
                  />
                ))}
              </g>
            ))}
          </svg>
          <div className={styles.overlay} aria-hidden="true">
            {model.axes.map(({ def, label }) => (
              <span
                key={def.key}
                className={styles.axisLabel}
                style={{
                  left: `${label.left}%`,
                  top: `${label.top}%`,
                  transform: TRANSFORM[label.align],
                }}
              >
                {def.label}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className={styles.message}>Pick at least 3 stats for the radar.</p>
      )}

      <div className={styles.legend}>
        {model.series.map((s) => (
          <div key={s.entity.id} className={styles.entry} style={seriesStyle(s.colorIndex)}>
            <span className={styles.name}>{s.entity.name}</span>
            <span className={styles.meta}>{s.entity.meta}</span>
            {s.missing.length > 0 && (
              <span className={styles.meta}>Not applicable: {s.missing.join(', ')}</span>
            )}
          </div>
        ))}
        <p className={styles.caption}>
          Axes scaled to league range; &quot;lower is better&quot; stats are inverted so outward is
          always better.
        </p>
      </div>

      <ul role="list" className={styles.srOnly} aria-label="Radar chart data">
        {model.series.map((s) => (
          <li key={s.entity.id}>
            {s.entity.name}
            <ul role="list">
              {s.values.map((v) => (
                <li key={v.def.key}>
                  {v.def.label}: {v.na ? 'not applicable' : v.text}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}
