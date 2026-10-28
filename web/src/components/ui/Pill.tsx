import type { ReactNode } from 'react'

import styles from './Pill.module.css'

/** Black pill used to mark the best value. */
export function Pill({ children }: { children: ReactNode }) {
  return <span className={styles.pill}>{children}</span>
}
