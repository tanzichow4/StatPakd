import { useSyncExternalStore } from 'react'
import { useDataProvider } from '../../dataSource'
import type { DataStatus } from '../../domain/provider'
import styles from './Data.module.css'

const QUIET: DataStatus = { pending: 0, error: null }
const never = () => () => {}
const quiet = () => QUIET

interface Props {
  /** Loads the page content again after the failure has been cleared. */
  onRetry: () => void
}

/** Says when data is loading, and offers a retry when a request has failed. */
export function DataStatusBar({ onRetry }: Props) {
  const source = useDataProvider().status
  const { pending, error } = useSyncExternalStore(
    source?.subscribe ?? never,
    source?.getSnapshot ?? quiet,
  )
  // A source that reports nothing never loads or fails.
  if (!source) return null

  if (error) {
    return (
      <div role="alert" className={styles.failure}>
        <span>Some data could not be loaded. {error}</span>
        <button
          type="button"
          className={styles.retry}
          onClick={() => {
            source.reset()
            onRetry()
          }}
        >
          Retry
        </button>
      </div>
    )
  }
  return (
    <output className={styles.loading} data-testid="data-loading">
      {pending > 0 ? 'Loading data…' : ''}
    </output>
  )
}
