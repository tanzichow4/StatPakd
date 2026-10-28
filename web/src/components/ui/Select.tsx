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
}

export function Select({ label, options, value, onChange, variant = 'light' }: Props) {
  return (
    <select
      aria-label={label}
      className={cx(styles.select, styles[variant])}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
