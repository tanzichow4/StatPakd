import DevPage from './pages/DevPage'

export default function App() {
  if (window.location.pathname === '/dev') return <DevPage />
  return <h1>StatPakd</h1>
}
