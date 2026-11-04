import { MAX_SELECTED, useAppState } from '../../state'
import type { TeamMode } from '../../state'
import { SegmentedControl } from '../ui'
import type { SegmentedOption } from '../ui'
import { teamModeHint } from './teamHeaderModel'
import styles from './TeamModeSwitch.module.css'

const OPTIONS: SegmentedOption<TeamMode>[] = [
  { value: 'compare', label: 'Compare teams' },
  { value: 'inside', label: 'Team breakdown' },
]

/** Compare/breakdown switch, shown only for the Teams kind. */
export function TeamModeSwitch() {
  const { state, dispatch } = useAppState()
  if (state.kind !== 'teams') return null
  return (
    <div className={styles.row}>
      <SegmentedControl
        label="Team view"
        options={OPTIONS}
        value={state.teamMode}
        onChange={(mode) => {
          if (mode !== state.teamMode) dispatch({ type: 'setTeamMode', mode })
        }}
      />
      <span className={styles.hint}>{teamModeHint(state.teamMode, MAX_SELECTED)}</span>
    </div>
  )
}
