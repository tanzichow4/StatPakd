import { useAppState } from '../../state'
import type { RosterUnitDef } from '../../domain/types'
import { SegmentedControl } from '../ui'

interface Props {
  units: readonly RosterUnitDef[]
}

/** Segmented control over the roster units supplied by the data. */
export function UnitToggle({ units }: Props) {
  const { state, dispatch } = useAppState()
  return (
    <SegmentedControl
      label="Unit"
      options={units.map((u) => ({ value: u.key, label: u.label }))}
      value={state.unit}
      onChange={(unit) => {
        if (unit !== state.unit) dispatch({ type: 'setUnit', unit })
      }}
    />
  )
}
