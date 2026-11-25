import type { DataProvider, DataStatus, DataStatusSource, GameFilter } from '../domain/provider'
import type {
  Entity,
  EntityId,
  EntityKind,
  GameLogEntry,
  League,
  LeagueId,
  LeagueUiDefaults,
  RosterEntry,
  RosterUnit,
  RosterUnitDef,
  Season,
  StatDef,
  TeamId,
} from '../domain/types'

export type Fetch = (url: string) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>

type Check = (value: unknown) => boolean

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const isText = (v: unknown) => typeof v === 'string'
const isStats = (v: unknown) =>
  isRecord(v) && Object.values(v).every((s) => s === null || typeof s === 'number')

/** An object whose listed fields all pass their checks. */
const shape =
  (fields: Record<string, Check>): Check =>
  (v) =>
    isRecord(v) && Object.entries(fields).every(([name, check]) => check(v[name]))
const listOf =
  (item: Check): Check =>
  (v) =>
    Array.isArray(v) && v.every(item)

const statDef = shape({ key: isText, label: isText, group: isText })
const checks = {
  leagues: listOf(shape({ id: isText, name: isText, enabled: (v) => typeof v === 'boolean' })),
  seasons: listOf(isText),
  statDefs: listOf(statDef),
  entities: listOf(
    shape({
      id: isText,
      name: isText,
      shortName: isText,
      meta: isText,
      badge: isText,
      stats: isStats,
    }),
  ),
  rosterUnits: listOf(shape({ key: isText, label: isText, stats: listOf(statDef) })),
  roster: listOf(shape({ id: isText, name: isText, position: isText, stats: isStats })),
  gameLog: listOf(
    shape({
      period: (v) => typeof v === 'number',
      label: isText,
      shortLabel: isText,
      played: (v) => typeof v === 'boolean',
      stats: isStats,
    }),
  ),
  uiDefaults: shape({
    season: isText,
    teamId: isText,
    unit: isText,
    sortKey: isText,
    players: isRecord,
    teams: isRecord,
  }),
}

const IDLE: DataStatus = { pending: 0, error: null }

/**
 * Data from the StatPakd API. Each address is requested once and the answer reused; a failed
 * request is forgotten so that it can be tried again.
 */
export class ApiProvider implements DataProvider {
  readonly notice = 'Data from nflverse.'
  readonly hasPlayoffs = true

  private readonly cache = new Map<string, Promise<unknown>>()
  private readonly listeners = new Set<() => void>()
  private snapshot: DataStatus = IDLE
  private readonly baseUrl: string
  private readonly fetcher: Fetch

  /** @param baseUrl prefix of the API, empty when it is served from the same address. */
  constructor(baseUrl = '', fetcher: Fetch = (url) => fetch(url)) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.fetcher = fetcher
  }

  readonly status: DataStatusSource = {
    subscribe: (listener) => {
      this.listeners.add(listener)
      return () => this.listeners.delete(listener)
    },
    getSnapshot: () => this.snapshot,
    reset: () => this.update({ error: null }),
  }

  getLeagues(): Promise<League[]> {
    return this.get('/api/leagues', checks.leagues)
  }

  getSeasons(leagueId: LeagueId): Promise<Season[]> {
    return this.get(`${league(leagueId)}/seasons`, checks.seasons)
  }

  getStatDefs(leagueId: LeagueId, kind: EntityKind): Promise<StatDef[]> {
    return this.get(`${league(leagueId)}/stat-defs?${query({ kind })}`, checks.statDefs)
  }

  getEntities(
    leagueId: LeagueId,
    kind: EntityKind,
    season: Season,
    filter?: GameFilter,
  ): Promise<Entity[]> {
    const search = query({ kind, season }, filter)
    return this.get(`${league(leagueId)}/entities?${search}`, checks.entities)
  }

  getRosterUnits(leagueId: LeagueId): Promise<RosterUnitDef[]> {
    return this.get(`${league(leagueId)}/roster-units`, checks.rosterUnits)
  }

  getRoster(
    leagueId: LeagueId,
    teamId: TeamId,
    unit: RosterUnit,
    season: Season,
    filter?: GameFilter,
  ): Promise<RosterEntry[]> {
    const path = `${league(leagueId)}/teams/${encodeURIComponent(teamId)}/roster`
    return this.get(`${path}?${query({ unit, season }, filter)}`, checks.roster)
  }

  getGameLog(
    leagueId: LeagueId,
    playerId: EntityId,
    season: Season,
    filter?: GameFilter,
  ): Promise<GameLogEntry[]> {
    const path = `${league(leagueId)}/players/${encodeURIComponent(playerId)}/game-log`
    return this.get(`${path}?${query({ season }, filter)}`, checks.gameLog)
  }

  getUiDefaults(leagueId: LeagueId): Promise<LeagueUiDefaults> {
    return this.get(`${league(leagueId)}/ui-defaults`, checks.uiDefaults)
  }

  private get<T>(path: string, check: Check): Promise<T> {
    let found = this.cache.get(path)
    if (!found) {
      found = this.load(path, check)
      this.cache.set(path, found)
    }
    return found as Promise<T>
  }

  private async load(path: string, check: Check): Promise<unknown> {
    this.update({ pending: this.snapshot.pending + 1 })
    try {
      const response = await this.fetcher(this.baseUrl + path)
      if (!response.ok) throw new Error(`The data server answered ${response.status}.`)
      const body: unknown = await response.json()
      if (!check(body)) throw new Error('The data server sent an unexpected answer.')
      return body
    } catch (error) {
      this.cache.delete(path)
      // A request that never reached the server has only a technical message.
      const message =
        error instanceof TypeError || !(error instanceof Error)
          ? 'The data server could not be reached.'
          : error.message
      this.update({ error: message })
      throw new Error(message, { cause: error })
    } finally {
      this.update({ pending: this.snapshot.pending - 1 })
    }
  }

  private update(change: Partial<DataStatus>): void {
    this.snapshot = { ...this.snapshot, ...change }
    for (const listener of this.listeners) listener()
  }
}

const league = (id: LeagueId) => `/api/leagues/${encodeURIComponent(id)}`
/** The query string; leaving playoffs out is the only filter that needs saying. */
const query = (values: Record<string, string>, filter?: GameFilter) =>
  new URLSearchParams(
    filter?.playoffs === false ? { ...values, playoffs: 'false' } : values,
  ).toString()
