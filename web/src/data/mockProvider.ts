import type { DataProvider } from '../domain/provider'
import type {
  Entity,
  EntityKind,
  League,
  LeagueId,
  RosterEntry,
  RosterUnit,
  RosterUnitDef,
  Season,
  StatDef,
  TeamId,
} from '../domain/types'
import { getLeagueRegistry } from './leagues'
import {
  NFL_SEASONS,
  ROSTER_UNITS,
  buildPlayers,
  buildRoster,
  buildTeams,
  playerStatDefs,
  rosterUnitDefs,
  teamStatDefs,
} from './nfl'
import { ROSTERS } from './nfl/raw'

/** In-memory provider serving the sample NFL data. */
export class MockProvider implements DataProvider {
  async getLeagues(): Promise<League[]> {
    return getLeagueRegistry()
  }

  async getSeasons(leagueId: LeagueId): Promise<Season[]> {
    if (!this.isEnabled(leagueId)) return []
    return [...NFL_SEASONS]
  }

  async getStatDefs(leagueId: LeagueId, kind: EntityKind): Promise<StatDef[]> {
    if (!this.isEnabled(leagueId)) return []
    return kind === 'players' ? playerStatDefs() : teamStatDefs()
  }

  async getEntities(leagueId: LeagueId, kind: EntityKind, season: Season): Promise<Entity[]> {
    if (!this.isEnabled(leagueId)) return []
    this.checkSeason(season)
    return kind === 'players' ? buildPlayers(season) : buildTeams(season)
  }

  async getRosterUnits(leagueId: LeagueId): Promise<RosterUnitDef[]> {
    if (!this.isEnabled(leagueId)) return []
    return rosterUnitDefs()
  }

  async getRoster(
    leagueId: LeagueId,
    teamId: TeamId,
    unit: RosterUnit,
    season: Season,
  ): Promise<RosterEntry[]> {
    if (!this.isEnabled(leagueId)) return []
    this.checkSeason(season)
    if (!Object.hasOwn(ROSTERS, teamId)) throw new Error(`Unknown team: ${teamId}`)
    if (!ROSTER_UNITS.some((u) => u === unit)) throw new Error(`Unknown unit: ${unit}`)
    return buildRoster(teamId, unit, season)
  }

  /** True for an enabled league; false for a disabled one; throws for an unknown id. */
  private isEnabled(leagueId: LeagueId): boolean {
    const league = getLeagueRegistry().find((l) => l.id === leagueId)
    if (!league) throw new Error(`Unknown league: ${leagueId}`)
    return league.enabled
  }

  private checkSeason(season: Season): void {
    if (!NFL_SEASONS.some((s) => s === season)) throw new Error(`Unknown season: ${season}`)
  }
}
