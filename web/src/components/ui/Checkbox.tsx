import type { Ref } from 'react'
import { cx } from '../../lib/cx'
import styles from './Checkbox.module.css'

interface Props {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  inputRef?: Ref<HTMLInputElement>
  /** Looks dimmed and ignores changes, but stays focusable (unlike `disabled`). */
  locked?: boolean
}

export function Checkbox({
  label,
  checked,
  onChange,
  disabled,
  className,
  inputRef,
  locked,
}: Props) {
  return (
    <label className={cx(styles.root, className)}>
      <input
        ref={inputRef}
        type="checkbox"
        className={styles.box}
        checked={checked}
        disabled={disabled}
        aria-disabled={locked ? true : undefined}
        onChange={(e) => {
          if (!locked) onChange(e.target.checked)
        }}
      />
      <span className={styles.label}>{label}</span>
    </label>
  )
}
