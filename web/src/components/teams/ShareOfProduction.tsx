import { useId, useMemo } from 'react'
import { useAppState } from '../../state'
import type { ReactNode } from 'react'
import type { RosterEntry, RosterUnitDef, Season, TeamId } from '../../domain/types'
import { ShareLegend } from './ShareLegend'
import { ShareRow } from './ShareRow'
import { UnitToggle } from './UnitToggle'
import { buildShareRow, findUnit, legendItems, shareStats } from './shareModel'
import { useRoster } from './useRoster'
import { useRosterUnits } from './useRosterUnits'
import styles from './ShareOfProduction.module.css'

interface Props {
  teamId: TeamId
  season: Season
  /** Rendered as a sibling after the share section once the unit and roster have loaded. */
  renderAfter?: (unit: RosterUnitDef, roster: readonly RosterEntry[]) => ReactNode
}

/** Share of team production: unit toggle, one stacked bar per share stat, and a legend. */
export function ShareOfProduction({ teamId, season, renderAfter }: Props) {
  const { state } = useAppState()
  const headingId = useId()
  const units = useRosterUnits()
  const unit = units ? findUnit(units, state.unit) : undefined
  const roster = useRoster(teamId, unit ? unit.key : null, season)

  const rows = useMemo(
    () => (unit && roster ? shareStats(unit).map((def) => buildShareRow(def, roster)) : []),
    [unit, roster],
  )
  const legend = useMemo(() => (roster ? legendItems(roster) : []), [roster])

  if (units === null) return null

  return (
    <>
      <section aria-labelledby={headingId} className={styles.section}>
        <div className={styles.header}>
          <div className={styles.titles}>
            <h2 id={headingId} className={styles.title}>
              Share of team production
            </h2>
            <p className={styles.subtitle}>How the workload splits across the roster</p>
          </div>
          <div className={styles.toggle}>
            <UnitToggle units={units} />
          </div>
        </div>
        {unit && roster && (
          <>
            <div className={styles.rows}>
              {rows.map((row) => (
                <ShareRow key={row.key} row={row} />
              ))}
            </div>
            <ShareLegend items={legend} />
          </>
        )}
      </section>
      {unit && roster && renderAfter?.(unit, roster)}
    </>
  )
}
