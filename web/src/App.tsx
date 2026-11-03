import { GlobalNav } from './components/nav'
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
        <main>
          <h1>StatPakd</h1>
        </main>
      </AppStateProvider>
    </DataSource>
  )
}
