import { describe, expect, it } from 'vitest'
import { getLeagueRegistry } from '../../data/leagues'
import {
  NFL_SEASONS,
  ROSTER_UNITS,
  nflUiDefaults,
  playerStatDefs,
  rosterUnitDefs,
  teamStatDefs,
} from '../../data/nfl'
import { RAW_T, ROSTERS } from '../../data/nfl/raw'
import shares from '../../lib/shares.ts?raw'
import index from './index.ts?raw'
import rosterModel from './rosterModel.ts?raw'
import rosterSection from './RosterSection.tsx?raw'
import rosterTable from './RosterTable.tsx?raw'
import shareLegend from './ShareLegend.tsx?raw'
import shareModel from './shareModel.ts?raw'
import shareOfProduction from './ShareOfProduction.tsx?raw'
import shareRow from './ShareRow.tsx?raw'
import teamBreakdown from './TeamBreakdown.tsx?raw'
import teamChips from './TeamChips.tsx?raw'
import teamHeader from './TeamHeader.tsx?raw'
import teamHeaderModel from './teamHeaderModel.ts?raw'
import teamModeSwitch from './TeamModeSwitch.tsx?raw'
import unitToggle from './UnitToggle.tsx?raw'
import useRoster from './useRoster.ts?raw'
import useRosterUnits from './useRosterUnits.ts?raw'

const sources: Record<string, string> = {
  'TeamBreakdown.tsx': teamBreakdown,
  'TeamChips.tsx': teamChips,
  'TeamHeader.tsx': teamHeader,
  'teamHeaderModel.ts': teamHeaderModel,
  'TeamModeSwitch.tsx': teamModeSwitch,
  'index.ts': index,
  'shareModel.ts': shareModel,
  'useRoster.ts': useRoster,
  'useRosterUnits.ts': useRosterUnits,
  'UnitToggle.tsx': unitToggle,
  'ShareRow.tsx': shareRow,
  'ShareLegend.tsx': shareLegend,
  'ShareOfProduction.tsx': shareOfProduction,
  'lib/shares.ts': shares,
  'rosterModel.ts': rosterModel,
  'RosterTable.tsx': rosterTable,
  'RosterSection.tsx': rosterSection,
}

const rosterNames = (): string[] =>
  Object.values(ROSTERS).flatMap((units) =>
    [...units.off, ...units.def].map((row) => row[0] as string),
  )

function leagueValues(): string[] {
  const d = nflUiDefaults()
  const leagues = getLeagueRegistry()
  const values = [
    d.season,
    d.teamId,
    d.unit,
    d.sortKey,
    ...d.players.sel,
    ...d.players.stats,
    ...d.teams.sel,
    ...d.teams.stats,
    ...NFL_SEASONS,
    ...ROSTER_UNITS,
    ...playerStatDefs().flatMap((s) => [s.key, s.group, s.label]),
    ...teamStatDefs().flatMap((s) => [s.key, s.group, s.label, s.summaryLabel ?? '']),
    ...rosterUnitDefs().flatMap((u) => [
      u.key,
      u.label,
      ...u.stats.flatMap((s) => [s.key, s.label, s.group, s.shareLabel ?? '']),
    ]),
    ...rosterNames(),
    ...RAW_T.flatMap((t) => [t[0], t[1], t[2], t[3]]),
    ...leagues.flatMap((l) => [l.id, l.name]),
    'QB',
    'RB',
    'WR',
    'TE',
  ].filter((v) => v !== '')
  return [...new Set(values)]
}

const quoted = (v: string) => [`'${v}'`, `"${v}"`, `\`${v}\``]
const findHits = (text: string) =>
  leagueValues().filter((v) => quoted(v).some((q) => text.includes(q)))

describe('AC20: team breakdown source files hold no league literals', () => {
  it('AC20: the source files were actually loaded', () => {
    for (const [name, text] of Object.entries(sources)) {
      expect({ name, long: text.length > 20 }).toEqual({ name, long: true })
    }
  })
  it('AC20: the literal list covers team ids, names, abbreviations, divisions and summary labels', () => {
    expect(leagueValues()).toEqual(
      expect.arrayContaining([
        'nfl',
        'NFL',
        'ppg',
        'Pts / G',
        'Yds / G',
        'Allowed / G',
        'TO Diff',
        'kc',
        'Kansas City Chiefs',
        'KC',
        'AFC West',
        'NFC East',
      ]),
    )
  })
  it('AC30: the literal list covers roster unit keys, labels, share labels and player names', () => {
    expect(leagueValues()).toEqual(
      expect.arrayContaining([
        'off',
        'def',
        'Offense',
        'Defense',
        'touch',
        'tgt',
        'scrim',
        'td',
        'tkl',
        'sk',
        'take',
        'pd',
        'Touches',
        'Targets',
        'Scrimmage Yds',
        'Touchdowns',
        'Tackles',
        'Sacks',
        'Takeaways',
        'Passes Defended',
        'Saquon Barkley',
      ]),
    )
  })
  it('AC24: the literal list covers the roster table stat keys and labels', () => {
    expect(leagueValues()).toEqual(
      expect.arrayContaining(['snap', 'Snap %', 'ypt', 'Yds / Touch', 'INT']),
    )
  })
  it('AC24: the scan would catch planted roster table literals', () => {
    expect(findHits(`${rosterTable}\nconst a = 'snap'`)).toContain('snap')
    expect(findHits(`${rosterTable}\nconst b = "Snap %"`)).toContain('Snap %')
    expect(findHits(`${rosterModel}\nconst c = 'ypt'`)).toContain('ypt')
    expect(findHits(`${rosterSection}\nconst d = "Offense"`)).toContain('Offense')
  })
  it.each(Object.keys(sources))('AC20: %s has no quoted league value', (name) => {
    expect(findHits(sources[name] as string)).toEqual([])
  })
  it('AC20: the scan would catch planted literals', () => {
    expect(findHits(`${teamBreakdown}\nconst x = 'ppg'`)).toContain('ppg')
    expect(findHits(`${teamHeader}\nconst y = "Pts / G"`)).toContain('Pts / G')
    expect(findHits(`${teamChips}\nconst z = "KC"`)).toContain('KC')
    expect(findHits(`${teamHeaderModel}\nconst w = 'Kansas City Chiefs'`)).toContain(
      'Kansas City Chiefs',
    )
    expect(findHits(`${teamModeSwitch}\nconst v = \`NFC East\``)).toContain('NFC East')
    expect(findHits(`${teamBreakdown}\nconst u = 'phi'`)).toContain('phi')
  })
})

describe('AC20: the team breakdown reads data only through the existing hooks', () => {
  it.each(Object.keys(sources))('AC20: %s does not import data/ or MockProvider', (name) => {
    expect(sources[name]).not.toMatch(/['"][^'"]*\/data\//)
    expect(sources[name]).not.toContain('MockProvider')
  })
  it('AC11: TeamBreakdown uses useEntities and useStatDefs', () => {
    expect(teamBreakdown).toContain('useEntities')
    expect(teamBreakdown).toContain('useStatDefs')
  })
  it('AC3: the hint number comes from MAX_SELECTED, not a literal', () => {
    expect(teamModeSwitch).toContain('MAX_SELECTED')
    expect(teamModeSwitch).not.toMatch(/\b8\b/)
  })
})
