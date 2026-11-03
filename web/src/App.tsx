import styles from './App.module.css'
import { GlobalNav } from './components/nav'
import { EntityPicker } from './components/picker'
import { StatSidebar } from './components/sidebar'
import { MockProvider } from './data/mockProvider'
import { nflStatDefsByKind, nflUiDefaults } from './data/nfl'
import { DataSource } from './dataSource'
import DevPage from './pages/DevPage'
import { AppStateProvider } from './state'

const provider = new MockProvider()

export default function App() {
  if (window.location.pathname === '/dev') return <DevPage />
  return (
    <DataSource provider={provider}>
      <AppStateProvider defaults={nflUiDefaults()} statDefs={nflStatDefsByKind()}>
        <GlobalNav />
        <main className={styles.content}>
          <h1 className={styles.srOnly}>StatPakd</h1>
          <EntityPicker />
          <div className={styles.body}>
            <StatSidebar />
            <section className={styles.panel} aria-label="Stat views" />
          </div>
        </main>
      </AppStateProvider>
    </DataSource>
  )
}
