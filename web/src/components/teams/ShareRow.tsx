/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions -- the bar is a labelled group of focusable image segments whose focus drives the tooltip; fieldset/img cannot lay out or name them this way */
import { useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { tooltipLeft } from './shareModel'
import type { ShareRowModel } from './shareModel'
import styles from './ShareRow.module.css'

interface Props {
  row: ShareRowModel
}

/** One stacked 100% bar: label and total, segments, and the leader line. */
export function ShareRow({ row }: Props) {
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const refs = useRef<(HTMLSpanElement | null)[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLSpanElement>(null)
  const [tipLeft, setTipLeft] = useState(0)
  const focused = row.segments.find((s) => s.id === focusedId)
  // Roving tabindex: one Tab stop per row. Falls back to the first segment when the
  // remembered one is gone (segments changed).
  const found = row.segments.findIndex((s) => s.id === activeId)
  const activeIndex = found === -1 ? 0 : found

  // Anchor the tooltip over the focused segment, clamped inside the bar wrapper.
  const focusedIndex = row.segments.findIndex((s) => s.id === focusedId)
  useLayoutEffect(() => {
    const seg = refs.current[focusedIndex]
    const wrap = wrapRef.current
    const tip = tipRef.current
    if (!seg || !wrap || !tip) return
    setTipLeft(tooltipLeft(seg.offsetLeft + seg.offsetWidth / 2, tip.offsetWidth, wrap.offsetWidth))
  }, [focusedIndex])

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const last = row.segments.length - 1
    let next: number
    if (e.key === 'ArrowRight') next = Math.min(activeIndex + 1, last)
    else if (e.key === 'ArrowLeft') next = Math.max(activeIndex - 1, 0)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last
    else return
    e.preventDefault()
    refs.current[next]?.focus()
  }

  return (
    <div className={styles.row}>
      <div className={styles.label}>
        <span className={styles.name}>{row.label}</span>
        <span className={styles.total}>{row.totalText}</span>
      </div>
      <div className={styles.barWrap} ref={wrapRef}>
        {focused && (
          <span
            role="tooltip"
            ref={tipRef}
            className={styles.tooltip}
            style={{ left: `${tipLeft}px` }}
          >
            {focused.tooltip}
          </span>
        )}
        <div role="group" aria-label={row.barLabel} className={styles.track} onKeyDown={onKeyDown}>
          {row.segments.map((s, i) => (
            <span
              key={s.id}
              ref={(el) => {
                refs.current[i] = el
              }}
              tabIndex={i === activeIndex ? 0 : -1}
              role="img"
              aria-label={s.tooltip}
              title={s.tooltip}
              className={styles.segment}
              style={{ flexGrow: s.value, background: s.color, color: s.textColor }}
              onFocus={() => {
                setFocusedId(s.id)
                setActiveId(s.id)
              }}
              onBlur={() => setFocusedId((cur) => (cur === s.id ? null : cur))}
            >
              {s.text !== null && <span aria-hidden="true">{s.text}</span>}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.leader}>{row.leaderText}</div>
    </div>
  )
}
