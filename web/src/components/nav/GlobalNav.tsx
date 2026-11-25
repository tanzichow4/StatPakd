import { useDataProvider } from '../../dataSource'
import { cx } from '../../lib/cx'
import { useAppState } from '../../state'
import { Checkbox, Select, SegmentedControl } from '../ui'
import styles from './GlobalNav.module.css'
import { useNavData } from './useNavData'

const KIND_OPTIONS = [
  { value: 'players', label: 'Players' },
  { value: 'teams', label: 'Teams' },
] as const

export function GlobalNav() {
  const { state, dispatch } = useAppState()
  const { leagues, activeLeagueId, seasons } = useNavData()
  const { hasPlayoffs } = useDataProvider()

  return (
    <header className={styles.bar}>
      <div className={styles.logo}>
        <span aria-hidden="true">Stat</span>
        <span aria-hidden="true" className={styles.pill}>
          Pakd
        </span>
        <span className={styles.srOnly}>StatPakd</span>
      </div>
      <nav aria-label="Leagues">
        <ul className={styles.leagues}>
          {leagues.map((l) => (
            <li key={l.id}>
              {l.enabled ? (
                <button
                  type="button"
                  className={styles.league}
                  aria-current={l.id === activeLeagueId ? 'page' : undefined}
                >
                  {l.name}
                </button>
              ) : (
                <button type="button" className={cx(styles.league, styles.disabled)} disabled>
                  {l.name}
                  <span className={styles.soon}>SOON</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <div className={styles.right}>
        <SegmentedControl
          variant="dark"
          label="Players or teams"
          options={[...KIND_OPTIONS]}
          value={state.kind}
          onChange={(kind) => dispatch({ type: 'setKind', kind })}
        />
        {/* The wrapped control is the Select component, which the linter cannot see through. */}
        {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label className={styles.seasonLabel}>
          Season
          <Select
            variant="dark"
            label="Season"
            value={state.season}
            options={seasons.map((s) => ({ value: s, label: `${s} Season` }))}
            onChange={(season) => dispatch({ type: 'setSeason', season })}
          />
        </label>
        {hasPlayoffs && (
          <Checkbox
            label="Include playoffs"
            checked={state.playoffs}
            onChange={() => dispatch({ type: 'togglePlayoffs' })}
            className={styles.playoffs}
          />
        )}
      </div>
    </header>
  )
}
