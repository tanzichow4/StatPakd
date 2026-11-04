import type { RosterUnitDef } from '../../domain/types'

/**
 * Roster units with their roster stat definitions, ported from the design's OFF_COLS / DEF_COLS
 * (column labels) and OFF_SHARE / DEF_SHARE (share labels). `take` is a share stat that is not a
 * table column, so it is marked `extra`.
 */
const ROSTER_UNIT_DEFS: readonly RosterUnitDef[] = [
  {
    key: 'off',
    label: 'Offense',
    stats: [
      { key: 'snap', label: 'Snap %', group: 'Offense' },
      { key: 'touch', label: 'Touches', group: 'Offense', shareLabel: 'Touches' },
      { key: 'tgt', label: 'Targets', group: 'Offense', shareLabel: 'Targets' },
      { key: 'scrim', label: 'Scrim Yds', group: 'Offense', shareLabel: 'Scrimmage Yds' },
      { key: 'td', label: 'TD', group: 'Offense', shareLabel: 'Touchdowns' },
      { key: 'ypt', label: 'Yds / Touch', group: 'Offense', decimals: 1 },
    ],
  },
  {
    key: 'def',
    label: 'Defense',
    stats: [
      { key: 'snap', label: 'Snap %', group: 'Defense' },
      { key: 'tkl', label: 'Tackles', group: 'Defense', shareLabel: 'Tackles' },
      { key: 'sk', label: 'Sacks', group: 'Defense', shareLabel: 'Sacks' },
      { key: 'take', label: 'Takeaways', group: 'Defense', extra: true, shareLabel: 'Takeaways' },
      { key: 'int', label: 'INT', group: 'Defense' },
      { key: 'pd', label: 'Pass Def', group: 'Defense', shareLabel: 'Passes Defended' },
      { key: 'ff', label: 'Forced Fum', group: 'Defense' },
    ],
  },
]

/** Fresh copy of the roster unit definitions. */
export function rosterUnitDefs(): RosterUnitDef[] {
  return ROSTER_UNIT_DEFS.map((u) => ({ ...u, stats: u.stats.map((s) => ({ ...s })) }))
}
