import { Fragment, useState } from 'react'
import styles from './App.module.css'
import { AnnouncerProvider } from './components/a11y'
import { ComparePanel } from './components/compare'
import { Bootstrap, type StartData } from './components/data/Bootstrap'
import { DataStatusBar } from './components/data/DataStatusBar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { GlobalNav } from './components/nav'
import { EntityPicker } from './components/picker'
import { StatSidebar } from './components/sidebar'
import { TeamBreakdown, TeamModeSwitch } from './components/teams'
import { PlayerViewSwitch, WeekView } from './components/weeks'
import { ApiProvider } from './data/apiProvider'
import { MockProvider } from './data/mockProvider'
import { nflStatDefsByKind, nflUiDefaults } from './data/nfl'
import { DataSource, useDataProvider } from './dataSource'
import DevPage from './pages/DevPage'
import { AppStateProvider, useAppState } from './state'

// Real data from the API, unless the sample data is asked for (as the tests do).
const sample = import.meta.env.VITE_DATA_SOURCE === 'mock'
const provider = sample ? new MockProvider() : new ApiProvider(import.meta.env.VITE_API_URL)
const sampleStart: StartData | undefined = sample
  ? { defaults: nflUiDefaults(), statDefs: nflStatDefsByKind() }
  : undefined

function AppMain() {
  const { state } = useAppState()
  const { notice, hasPlayoffs } = useDataProvider()
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
      {notice && (
        <p className={styles.notice}>
          {notice}
          {hasPlayoffs && ` Playoff games are ${state.playoffs ? 'included' : 'not included'}.`}
        </p>
      )}
    </main>
  )
}

/** The page under the app state. A retry builds it again, so that everything reloads. */
function Page() {
  const [attempt, setAttempt] = useState(0)
  return (
    <AnnouncerProvider>
      <DataStatusBar onRetry={() => setAttempt((n) => n + 1)} />
      <Fragment key={attempt}>
        <GlobalNav />
        <AppMain />
      </Fragment>
    </AnnouncerProvider>
  )
}

export default function App() {
  if (window.location.pathname === '/dev') return <DevPage />
  return (
    <ErrorBoundary>
      <DataSource provider={provider}>
        <Bootstrap initial={sampleStart}>
          {({ defaults, statDefs }) => (
            <AppStateProvider defaults={defaults} statDefs={statDefs}>
              <Page />
            </AppStateProvider>
          )}
        </Bootstrap>
      </DataSource>
    </ErrorBoundary>
  )
}
