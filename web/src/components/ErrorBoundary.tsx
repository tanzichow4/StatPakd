import { Component, type ReactNode } from 'react'
import styles from './ErrorBoundary.module.css'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** Shows a message and a reload button instead of a blank page when the app crashes. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <main role="alert" className={styles.root}>
        <h1 className={styles.heading}>Something went wrong</h1>
        <p>The page hit an error. Reloading usually fixes it.</p>
        <p className={styles.detail}>{error.message}</p>
        <button type="button" className={styles.reload} onClick={() => window.location.reload()}>
          Reload page
        </button>
      </main>
    )
  }
}
