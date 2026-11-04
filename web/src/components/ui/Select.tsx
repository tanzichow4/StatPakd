import { cx } from '../../lib/cx'
import styles from './Select.module.css'

export interface SelectOption {
  value: string
  label: string
}

interface Props {
  label: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  variant?: 'light' | 'dark'
  /** Shown as a disabled first option when `value` is not among the options. */
  placeholder?: string
  className?: string
}

export function Select({
  label,
  options,
  value,
  onChange,
  variant = 'light',
  placeholder,
  className,
}: Props) {
  const unknown = placeholder !== undefined && !options.some((o) => o.value === value)
  return (
    <select
      aria-label={label}
      className={cx(styles.select, styles[variant], className)}
      value={unknown ? '' : value}
      onChange={(e) => onChange(e.target.value)}
    >
      {unknown && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
