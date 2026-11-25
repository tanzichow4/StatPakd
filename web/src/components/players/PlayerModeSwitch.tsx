import { useAppState, type PlayerMode } from '../../state'
import { SegmentedControl, type SegmentedOption } from '../ui'
import styles from './PlayerDetail.module.css'

const OPTIONS: SegmentedOption<PlayerMode>[] = [
  { value: 'compare', label: 'Compare players' },
  { value: 'detail', label: 'Player detail' },
]

/** Compare/detail switch, shown only for the Players kind. */
export function PlayerModeSwitch() {
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
      <span className={styles.hint}>
        {state.playerMode === 'detail' ? 'One player, week by week' : 'Players side by side'}
      </span>
    </div>
  )
}
