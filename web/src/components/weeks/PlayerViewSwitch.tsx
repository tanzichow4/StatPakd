import { useAppState, type PlayerMode } from '../../state'
import { SegmentedControl, type SegmentedOption } from '../ui'
import styles from './Weeks.module.css'

const OPTIONS: SegmentedOption<PlayerMode>[] = [
  { value: 'weeks', label: 'Week to week' },
  { value: 'season', label: 'Season totals' },
]

/** Week to week or season totals, shown only for the Players kind. */
export function PlayerViewSwitch() {
  const { state, dispatch } = useAppState()
  if (state.kind !== 'players') return null
  return (
    <div className={styles.modeRow}>
      <SegmentedControl
        label="Player view"
        options={OPTIONS}
        value={state.playerMode}
        onChange={(mode) => dispatch({ type: 'setPlayerMode', mode })}
      />
      <span className={styles.hint}>Pick one player for trends, or several to compare</span>
    </div>
  )
}
