import type {
  Entity,
  EntityKind,
  League,
  LeagueId,
  RosterEntry,
  RosterUnit,
  Season,
  StatDef,
  TeamId,
} from './types'

/**
 * The data contract the UI depends on, and what T22 (the API) must serve.
 *
 * - Every method is async and returns a Promise.
 * - Failures reject the promise. No error type is part of this contract.
 * - An empty result is a resolved empty array, not a rejection.
 * - Stats: a `null` value means "not applicable" (distinct from zero);
 *   a missing key means the stat is not provided.
 * - Runtime validation of incoming data is the job of the API provider (T23).
 */
export interface DataProvider {
  /** Resolves to every league, including ones that are not enabled yet. */
  getLeagues(): Promise<League[]>

  /**
   * Resolves to the season labels of a league, newest first.
   * @param leagueId id of a league from `getLeagues`.
   */
  getSeasons(leagueId: LeagueId): Promise<Season[]>

  /**
   * Resolves to the stat definitions for one kind of entity.
   * @param leagueId id of a league from `getLeagues`.
   * @param kind whether to describe player stats or team stats.
   */
  getStatDefs(leagueId: LeagueId, kind: EntityKind): Promise<StatDef[]>

  /**
   * Resolves to the entities of one kind with their stats for a season.
   * @param leagueId id of a league from `getLeagues`.
   * @param kind players or teams.
   * @param season a label from `getSeasons`.
   */
  getEntities(leagueId: LeagueId, kind: EntityKind, season: Season): Promise<Entity[]>

  /**
   * Resolves to the roster of one team for a season.
   * @param leagueId id of a league from `getLeagues`.
   * @param teamId id of a team entity.
   * @param unit opaque roster unit key; valid values are defined by the data.
   * @param season a label from `getSeasons`.
   */
  getRoster(
    leagueId: LeagueId,
    teamId: TeamId,
    unit: RosterUnit,
    season: Season,
  ): Promise<RosterEntry[]>
}
