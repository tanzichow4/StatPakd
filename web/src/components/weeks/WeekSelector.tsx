import { useId } from 'react'
import { Chip, Select } from '../ui'
import { RECENT_COUNT, type Period } from './weekModel'
import styles from './Weeks.module.css'

interface Props {
  periods: readonly Period[]
  /** The periods being looked at. */
  chosen: readonly Period[]
  /** `null` chooses every period. */
  onChoose: (periods: number[] | null) => void
}

/** Picks which weeks the view covers: shortcuts, a range, or single weeks. */
export function WeekSelector({ periods, chosen, onChoose }: Props) {
  const headingId = useId()
  const picked = new Set(chosen.map((p) => p.period))
  const numbers = periods.map((p) => p.period)
  const from = chosen[0]?.period ?? numbers[0]
  const to = chosen[chosen.length - 1]?.period ?? numbers[numbers.length - 1]
  const options = periods.map((p) => ({ value: String(p.period), label: p.label }))
  const range = (a: number, b: number) =>
    onChoose(numbers.filter((n) => n >= Math.min(a, b) && n <= Math.max(a, b)))
  const toggle = (period: number) =>
    onChoose(numbers.filter((n) => (n === period ? !picked.has(n) : picked.has(n))))

  return (
    <section aria-labelledby={headingId} className={styles.selector}>
      <div className={styles.selectorRow}>
        <h2 id={headingId} className={styles.heading}>
          Weeks
        </h2>
        <button type="button" className={styles.shortcut} onClick={() => onChoose(null)}>
          All
        </button>
        <button
          type="button"
          className={styles.shortcut}
          onClick={() => onChoose(numbers.slice(-RECENT_COUNT))}
        >
          Last {RECENT_COUNT}
        </button>
        <button type="button" className={styles.shortcut} onClick={() => onChoose([])}>
          Clear
        </button>
        <div className={styles.field}>
          <span>From</span>
          <Select
            label="First week"
            options={options}
            value={String(from)}
            onChange={(v) => range(Number(v), Math.max(Number(v), to))}
          />
        </div>
        <div className={styles.field}>
          <span>To</span>
          <Select
            label="Last week"
            options={options}
            value={String(to)}
            onChange={(v) => range(Math.min(from, Number(v)), Number(v))}
          />
        </div>
      </div>
      <fieldset className={styles.chips} aria-label="Single weeks">
        {periods.map((p) => (
          <Chip key={p.period} mono active={picked.has(p.period)} onClick={() => toggle(p.period)}>
            <span aria-hidden="true">{p.shortLabel}</span>
            <span className={styles.srOnly}>{p.label}</span>
          </Chip>
        ))}
      </fieldset>
    </section>
  )
}
