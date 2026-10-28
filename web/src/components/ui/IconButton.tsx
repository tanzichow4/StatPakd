import type { ReactNode } from 'react'

import styles from './IconButton.module.css'

interface Props {
  label: string
  onClick: () => void
  children: ReactNode
}

/** Round icon-only button, e.g. the remove button. `label` is the accessible name. */
export function IconButton({ label, onClick, children }: Props) {
  return (
    <button type="button" aria-label={label} className={styles.btn} onClick={onClick}>
      <span aria-hidden="true">{children}</span>
    </button>
  )
}
