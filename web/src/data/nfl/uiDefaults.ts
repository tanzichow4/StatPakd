import type { EntityKind, LeagueUiDefaults, StatDef } from '../../domain/types'
import { playerStatDefs, teamStatDefs } from './statDefs'

/** NFL initial UI choices. Returns a fresh copy on each call. */
export function nflUiDefaults(): LeagueUiDefaults {
  return {
    season: '2024',
    teamId: 'phi',
    unit: 'off',
    sortKey: 'snap',
    players: {
      sel: ['allen', 'barkley', 'chase'],
      stats: ['passYds', 'passTd', 'rushYds', 'recYds', 'scrim', 'totTd'],
      ax: ['rushYds', 'recYds', 'totTd'],
    },
    teams: {
      sel: ['kc', 'det', 'bal'],
      stats: ['ppg', 'ypg', 'third', 'papg', 'to', 'win'],
      ax: ['ppg', 'papg', 'to'],
    },
  }
}

/** NFL stat definitions for each entity kind. */
export function nflStatDefsByKind(): Record<EntityKind, StatDef[]> {
  return { players: playerStatDefs(), teams: teamStatDefs() }
}
