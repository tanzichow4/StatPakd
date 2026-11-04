/* oxlint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/prefer-tag-over-role -- the plot is one focusable group that rotates by pointer drag and arrow keys */
import {
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import type { Entity, StatDef } from '../../domain/types'
import { cx } from '../../lib/cx'
import { dragCamera, type AxisKeys, type Camera } from '../../lib/projection'
import { useAppState } from '../../state'
import { seriesColor } from '../../styles/series'
import { AxisControls } from './AxisControls'
import {
  CHART3D,
  axisDefs,
  axisOptions,
  cameraForKey,
  chart3dModel,
  readoutModel,
} from './chart3dModel'
import { Readout } from './Readout'
import { resolveColumns } from './tableModel'
import styles from './Chart3D.module.css'

interface Props {
  pool: readonly Entity[]
  defs: readonly StatDef[]
}

interface DragState {
  pointerId: number
  startX: number
  startY: number
  start: Camera
}

export function Chart3D({ pool, defs }: Props) {
  const { state, dispatch } = useAppState()
  const { kind, yaw, pitch } = state
  const axes: AxisKeys = state.ax[kind]
  const sel = state.sel[kind]
  const hintId = useId()
  const keysId = useId()
  const drag = useRef<DragState | null>(null)
  const [dragging, setDragging] = useState(false)

  const defs3 = useMemo(() => axisDefs(axes, defs), [axes, defs])
  const options = useMemo(() => axisOptions(defs), [defs])
  const model = useMemo(
    () => chart3dModel(pool, axes, sel, { yaw, pitch }, defs3),
    [pool, axes, sel, yaw, pitch, defs3],
  )
  const cards = useMemo(
    () => readoutModel(resolveColumns(sel, pool), axes, defs3),
    [sel, pool, axes, defs3],
  )

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== e.pointerId) return
    drag.current = null
    setDragging(false)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current || !e.isPrimary) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      start: { yaw, pitch },
    }
    setDragging(true)
    e.currentTarget.focus()
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } catch {
      // capture is best effort
    }
    e.preventDefault()
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (d?.pointerId !== e.pointerId) return
    const next = dragCamera(d.start, e.clientX - d.startX, e.clientY - d.startY)
    dispatch({ type: 'setCamera', yaw: next.yaw, pitch: next.pitch })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const action = cameraForKey(e, { yaw, pitch })
    if (!action) return
    e.preventDefault()
    dispatch(action)
  }

  return (
    <div className={styles.root}>
      <div className={styles.chartCol}>
        <AxisControls
          options={options}
          axes={axes}
          onAxis={(index, key) => dispatch({ type: 'setAxis', index, key })}
          onReset={() => dispatch({ type: 'resetView' })}
        />
        <div
          role="group"
          aria-label="3D chart"
          aria-describedby={model.ok ? `${hintId} ${keysId}` : undefined}
          tabIndex={0}
          className={cx(styles.card, dragging && styles.dragging)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onKeyDown={onKeyDown}
        >
          {model.ok ? (
            <>
              <svg
                viewBox={`0 0 ${CHART3D.width} ${CHART3D.height}`}
                className={styles.svg}
                aria-hidden="true"
                focusable="false"
              >
                {model.grid.map((l, i) => (
                  <line key={i} {...l} className={styles.grid} data-testid="grid-line" />
                ))}
                {model.edges.map((l, i) => (
                  <line key={i} {...l} className={styles.edge} data-testid="edge-line" />
                ))}
                {model.axes.map((l, i) => (
                  <line key={i} {...l} className={styles.axis} data-testid="axis-line" />
                ))}
                {model.points.map((p) => {
                  const selected = p.selIndex >= 0
                  const style = selected
                    ? ({ '--series': seriesColor(p.selIndex) } as CSSProperties)
                    : undefined
                  return (
                    <g
                      key={p.id}
                      style={style}
                      className={selected ? styles.selected : styles.unselected}
                      data-testid="point"
                    >
                      <line x1={p.x} y1={p.y} x2={p.footX} y2={p.footY} className={styles.drop} />
                      <circle cx={p.x} cy={p.y} r={selected ? 7 : 4.5} className={styles.dot} />
                    </g>
                  )
                })}
              </svg>
              <div className={styles.overlay} aria-hidden="true">
                {model.labels.map((l) => (
                  <span
                    key={l.letter}
                    className={cx(styles.axisLabel, l.side === 'before' && styles.before)}
                    data-testid="axis-label"
                    style={{ left: `${l.left}%`, top: `${l.top}%` }}
                  >
                    {l.text}
                  </span>
                ))}
                {model.tags.map((t) => (
                  <span
                    key={t.id}
                    className={styles.tag}
                    data-testid="name-tag"
                    style={{ left: `${t.left}%`, top: `${t.top}%` }}
                  >
                    {t.name}
                  </span>
                ))}
              </div>
              <span id={hintId} className={styles.hint}>
                Drag to rotate · gray dots = rest of league
              </span>
              <span id={keysId} className={styles.srOnly}>
                Use arrow keys to rotate, Home to reset.
              </span>
            </>
          ) : (
            <p className={styles.message}>Pick a stat for each axis.</p>
          )}
        </div>
      </div>
      <div className={styles.readoutCol}>
        <Readout cards={cards} kind={kind} />
      </div>
    </div>
  )
}
