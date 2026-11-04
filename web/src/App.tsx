import styles from './App.module.css'
import { ComparePanel } from './components/compare'
import { GlobalNav } from './components/nav'
import { EntityPicker } from './components/picker'
import { StatSidebar } from './components/sidebar'
import { TeamBreakdown, TeamModeSwitch } from './components/teams'
import { MockProvider } from './data/mockProvider'
import { nflStatDefsByKind, nflUiDefaults } from './data/nfl'
import { DataSource } from './dataSource'
import DevPage from './pages/DevPage'
import { AppStateProvider, useAppState } from './state'

const provider = new MockProvider()

function AppMain() {
  const { state } = useAppState()
  const breakdown = state.kind === 'teams' && state.teamMode === 'inside'
  return (
    <main className={styles.content}>
      <h1 className={styles.srOnly}>StatPakd</h1>
      <TeamModeSwitch />
      {breakdown ? (
        <TeamBreakdown />
      ) : (
        <>
          <EntityPicker />
          <div className={styles.body}>
            <StatSidebar />
            <section className={styles.panel} aria-label="Stat views">
              <ComparePanel />
            </section>
          </div>
        </>
      )}
    </main>
  )
}

export default function App() {
  if (window.location.pathname === '/dev') return <DevPage />
  return (
    <DataSource provider={provider}>
      <AppStateProvider defaults={nflUiDefaults()} statDefs={nflStatDefsByKind()}>
        <GlobalNav />
        <AppMain />
      </AppStateProvider>
    </DataSource>
  )
}
