import styles from './App.module.css'
import { AnnouncerProvider } from './components/a11y'
import { ComparePanel } from './components/compare'
import { ErrorBoundary } from './components/ErrorBoundary'
import { GlobalNav } from './components/nav'
import { EntityPicker } from './components/picker'
import { StatSidebar } from './components/sidebar'
import { TeamBreakdown, TeamModeSwitch } from './components/teams'
import { PlayerViewSwitch, WeekView } from './components/weeks'
import { MockProvider } from './data/mockProvider'
import { nflStatDefsByKind, nflUiDefaults } from './data/nfl'
import { DataSource } from './dataSource'
import DevPage from './pages/DevPage'
import { AppStateProvider, useAppState } from './state'

const provider = new MockProvider()

function AppMain() {
  const { state } = useAppState()
  const breakdown = state.kind === 'teams' && state.teamMode === 'inside'
  const weekly = state.kind === 'players' && state.playerMode === 'weeks'
  return (
    <main className={styles.content}>
      <h1 className={styles.srOnly}>StatPakd</h1>
      <PlayerViewSwitch />
      <TeamModeSwitch />
      {weekly ? (
        <>
          <EntityPicker />
          <WeekView />
        </>
      ) : breakdown ? (
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
    <ErrorBoundary>
      <DataSource provider={provider}>
        <AppStateProvider defaults={nflUiDefaults()} statDefs={nflStatDefsByKind()}>
          <AnnouncerProvider>
            <GlobalNav />
            <AppMain />
          </AnnouncerProvider>
        </AppStateProvider>
      </DataSource>
    </ErrorBoundary>
  )
}
