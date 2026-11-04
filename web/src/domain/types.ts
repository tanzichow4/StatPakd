/** Identifier of a league (opaque string supplied by the data source). */
export type LeagueId = string

/** Identifier of a team (opaque string supplied by the data source). */
export type TeamId = string

/** Identifier of a player or team entity (opaque string). */
export type EntityId = string

/** A season label, for example "2002". */
export type Season = string

/** A roster unit key. Opaque: valid values come from data, not from this module. */
export type RosterUnit = string

/** A single stat value. `null` means "not applicable" (distinct from zero). */
export type StatValue = number | null

/**
 * Stat values keyed by stat key.
 * A `null` value means "not applicable" (distinct from zero).
 * A missing key means the stat is not provided.
 */
export type StatMap = Record<string, StatValue>

/** What kind of entity a table or chart shows. */
export type EntityKind = 'players' | 'teams'

/** A league offered by the data source. */
export interface League {
  id: LeagueId
  /** Display label. */
  name: string
  /** When false the league is listed but not yet available. */
  enabled: boolean
}

/** Definition of one stat column. */
export interface StatDef {
  key: string
  label: string
  group: string
  /** Number of decimal places to show. */
  decimals?: number
  /** True when a smaller value is better. */
  lowerIsBetter?: boolean
  /** True when positive values should show an explicit sign. */
  signed?: boolean
  /** True for secondary stats that are hidden by default. */
  extra?: boolean
  /**
   * Short label shown in the team header summary. When set, the stat is a summary stat.
   * Summary stats show in definition order.
   */
  summaryLabel?: string
}

/** Default selections for one entity kind. */
export interface KindDefaults {
  /** Initially selected entity ids, in colour order. */
  sel: EntityId[]
  /** Initially shown stat keys. */
  stats: string[]
  /** Initial stat keys for the X, Y and Z axes. */
  ax: [string, string, string]
}

/** Initial UI choices for a league, supplied by the data layer. */
export interface LeagueUiDefaults {
  season: Season
  teamId: TeamId
  unit: RosterUnit
  /** Initial roster sort key. */
  sortKey: string
  players: KindDefaults
  teams: KindDefaults
}

/** A player or team with its stats for one season. */
export interface Entity {
  id: EntityId
  name: string
  shortName: string
  /** Preformatted subtitle line; the UI does not parse it. */
  meta: string
  /** Short text shown in the entity tile. */
  badge: string
  position?: string
  teamId?: TeamId
  /**
   * Stat values by stat key.
   * A `null` value means "not applicable" (distinct from zero).
   * A missing key means the stat is not provided.
   */
  stats: StatMap
}

/** One row of a team roster. */
export interface RosterEntry {
  id: EntityId
  name: string
  position: string
  /** Shirt number. */
  number?: number
  /**
   * Stat values by stat key.
   * A `null` value means "not applicable" (distinct from zero).
   * A missing key means the stat is not provided.
   */
  stats: StatMap
}
