import styles from './Checkbox.module.css'

interface Props {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function Checkbox({ label, checked, onChange, disabled }: Props) {
  return (
    <label className={styles.root}>
      <input
        type="checkbox"
        className={styles.box}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.label}>{label}</span>
    </label>
  )
}
