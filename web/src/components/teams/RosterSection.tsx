import { useId, useMemo } from 'react'
import type { RosterEntry, RosterUnitDef } from '../../domain/types'
import { useAppState } from '../../state'
import { RosterTable } from './RosterTable'
import { buildRosterTable } from './rosterModel'
import styles from './RosterSection.module.css'

interface Props {
  unit: RosterUnitDef
  roster: readonly RosterEntry[]
}

/** Roster section: heading, sortable table driven by `state.tSort`, and a caption. */
export function RosterSection({ unit, roster }: Props) {
  const { state, dispatch } = useAppState()
  const headingId = useId()
  const captionId = useId()
  const model = useMemo(
    () => buildRosterTable(unit, roster, state.tSort),
    [unit, roster, state.tSort],
  )

  return (
    <section aria-labelledby={headingId} className={styles.section}>
      <h2 id={headingId} className={styles.title}>
        Roster
      </h2>
      <RosterTable
        columns={model.columns}
        rows={model.rows}
        labelledBy={headingId}
        describedBy={captionId}
        onSort={(key) => dispatch({ type: 'sortRoster', key })}
      />
      <p id={captionId} className={styles.caption}>
        Click a column to sort · Black = team leader
      </p>
    </section>
  )
}
