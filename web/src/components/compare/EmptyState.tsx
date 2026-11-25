import type { EntityKind } from '../../domain/types'
import { kindSingular } from '../picker/filterEntities'
import styles from './EmptyState.module.css'

export function EmptyState({ kind }: { kind: EntityKind }) {
  return <p className={styles.box}>Add a {kindSingular(kind)} to start comparing.</p>
}
