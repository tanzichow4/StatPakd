import type { ReactNode } from 'react'

import { cx } from '../../lib/cx'
import styles from './Chip.module.css'

interface Props {
  active: boolean
  onClick: () => void
  children: ReactNode
  mono?: boolean
}

export function Chip({ active, onClick, children, mono }: Props) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cx(styles.chip, active && styles.active, mono && 'mono')}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
