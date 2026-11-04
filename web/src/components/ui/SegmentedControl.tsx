import { cx } from '../../lib/cx'
import styles from './SegmentedControl.module.css'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  variant?: 'light' | 'dark'
  size?: 'md' | 'sm'
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  variant = 'light',
  size = 'md',
}: Props<T>) {
  return (
    <fieldset
      aria-label={label}
      className={cx(styles.track, styles[variant], size === 'sm' && styles.sm)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          className={cx(styles.item, o.value === value && styles.active)}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </fieldset>
  )
}
