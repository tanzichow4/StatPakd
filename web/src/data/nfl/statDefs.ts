import type { StatDef } from '../../domain/types'

/** Player stat definitions, ported from the design's STATS.players (same order). */
const PLAYER_STAT_DEFS: readonly StatDef[] = [
  { key: 'passYds', label: 'Pass Yds', group: 'Passing' },
  { key: 'passTd', label: 'Pass TD', group: 'Passing' },
  { key: 'int', label: 'Interceptions', group: 'Passing', lowerIsBetter: true },
  { key: 'cmp', label: 'Comp %', group: 'Passing', decimals: 1 },
  { key: 'rate', label: 'Passer Rating', group: 'Passing', decimals: 1 },
  { key: 'rushYds', label: 'Rush Yds', group: 'Rushing' },
  { key: 'rushTd', label: 'Rush TD', group: 'Rushing' },
  { key: 'ypc', label: 'Yds / Carry', group: 'Rushing', decimals: 1 },
  { key: 'rec', label: 'Receptions', group: 'Receiving' },
  { key: 'recYds', label: 'Rec Yds', group: 'Receiving' },
  { key: 'recTd', label: 'Rec TD', group: 'Receiving' },
  { key: 'ypr', label: 'Yds / Catch', group: 'Receiving', decimals: 1 },
  { key: 'scrim', label: 'Scrimmage Yds', group: 'Totals' },
  { key: 'totTd', label: 'Scrimmage TD', group: 'Totals' },
  { key: 'passYpg', label: 'Pass Yds / G', group: 'Passing', decimals: 1, extra: true },
  { key: 'tdInt', label: 'TD : INT', group: 'Passing', decimals: 1, extra: true },
  { key: 'carries', label: 'Carries', group: 'Rushing', extra: true },
  { key: 'rushYpg', label: 'Rush Yds / G', group: 'Rushing', decimals: 1, extra: true },
  { key: 'tgt', label: 'Targets', group: 'Receiving', extra: true },
  { key: 'recYpg', label: 'Rec Yds / G', group: 'Receiving', decimals: 1, extra: true },
  { key: 'touches', label: 'Touches', group: 'Totals', extra: true },
  { key: 'ypt', label: 'Yds / Touch', group: 'Totals', decimals: 1, extra: true },
]

/** Team stat definitions, ported from the design's STATS.teams (same order). */
const TEAM_STAT_DEFS: readonly StatDef[] = [
  { key: 'ppg', label: 'Points / G', group: 'Offense', decimals: 1 },
  { key: 'ypg', label: 'Yards / G', group: 'Offense', decimals: 1 },
  { key: 'pass', label: 'Pass Yds / G', group: 'Offense', decimals: 1 },
  { key: 'rush', label: 'Rush Yds / G', group: 'Offense', decimals: 1 },
  { key: 'third', label: '3rd Down %', group: 'Offense', decimals: 1 },
  { key: 'papg', label: 'Pts Allowed / G', group: 'Defense', decimals: 1, lowerIsBetter: true },
  { key: 'to', label: 'Turnover Diff', group: 'Overall', signed: true },
  { key: 'win', label: 'Win %', group: 'Overall', decimals: 1 },
  { key: 'totPts', label: 'Total Points', group: 'Offense', extra: true },
  { key: 'passPct', label: 'Pass Yds Share %', group: 'Offense', decimals: 1, extra: true },
  {
    key: 'yapg',
    label: 'Yds Allowed / G',
    group: 'Defense',
    decimals: 1,
    lowerIsBetter: true,
    extra: true,
  },
  {
    key: 'pdiff',
    label: 'Point Diff / G',
    group: 'Overall',
    decimals: 1,
    signed: true,
    extra: true,
  },
  { key: 'wins', label: 'Wins', group: 'Overall', extra: true },
]

/** Fresh copy of the player stat definitions. */
export function playerStatDefs(): StatDef[] {
  return PLAYER_STAT_DEFS.map((d) => ({ ...d }))
}

/** Fresh copy of the team stat definitions. */
export function teamStatDefs(): StatDef[] {
  return TEAM_STAT_DEFS.map((d) => ({ ...d }))
}
