import { useEffect, useMemo } from 'react'
import { useAppState } from '../../state'
import { useEntities } from '../picker/useEntities'
import { useStatDefs } from '../sidebar/useStatDefs'
import { ShareOfProduction } from './ShareOfProduction'
import { TeamChips } from './TeamChips'
import { TeamHeader } from './TeamHeader'
import { findTeam, summaryStats, teamMetaLine } from './teamHeaderModel'
import styles from './TeamBreakdown.module.css'

/** Team breakdown mode: team chips and the header card of the chosen team. */
export function TeamBreakdown() {
  const { state, dispatch } = useAppState()
  const { season, teamId } = state
  const teams = useEntities('teams', season)
  const defs = useStatDefs('teams')

  // Entering breakdown must never leave an add-stat menu open.
  useEffect(() => {
    dispatch({ type: 'closeAddStatMenu' })
  }, [dispatch])

  const team = useMemo(() => findTeam(teams, teamId), [teams, teamId])
  const summary = useMemo(() => (team ? summaryStats(defs, team.stats) : []), [team, defs])

  if (teams.length === 0) return null

  return (
    <div className={styles.root}>
      <TeamChips
        teams={teams}
        activeId={teamId}
        onSelect={(id) => dispatch({ type: 'setTeam', teamId: id })}
      />
      {team && (
        <>
          <TeamHeader
            badge={team.badge}
            name={team.name}
            meta={teamMetaLine(team, season)}
            summary={summary}
          />
          <ShareOfProduction teamId={teamId} season={season} />
        </>
      )}
    </div>
  )
}
