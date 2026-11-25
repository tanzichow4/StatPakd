import { describe, expect, it } from 'vitest'
import { getLeagueRegistry } from '../../data/leagues'
import {
  NFL_SEASONS,
  ROSTER_UNITS,
  nflUiDefaults,
  playerStatDefs,
  teamStatDefs,
} from '../../data/nfl'
import addStatMenu from './AddStatMenu.tsx?raw'
import groupStats from './groupStats.ts?raw'
import index from './index.ts?raw'
import statGroup from './StatGroup.tsx?raw'
import statSidebar from './StatSidebar.tsx?raw'
import useStatDefs from './useStatDefs.ts?raw'

const sources: Record<string, string> = {
  'StatSidebar.tsx': statSidebar,
  'StatGroup.tsx': statGroup,
  'AddStatMenu.tsx': addStatMenu,
  'useStatDefs.ts': useStatDefs,
  'groupStats.ts': groupStats,
  'index.ts': index,
}

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
    ...d.players.ax,
    ...d.teams.sel,
    ...d.teams.stats,
    ...d.teams.ax,
    ...NFL_SEASONS,
    ...ROSTER_UNITS,
    ...playerStatDefs().flatMap((s) => [s.key, s.group, s.label]),
    ...teamStatDefs().flatMap((s) => [s.key, s.group, s.label]),
    ...leagues.flatMap((l) => [l.id, l.name]),
    'QB',
    'RB',
    'WR',
    'TE',
  ]
  return [...new Set(values)]
}

const quoted = (v: string) => [`'${v}'`, `"${v}"`, `\`${v}\``]
const findHits = (text: string) =>
  leagueValues().filter((v) => quoted(v).some((q) => text.includes(q)))

describe('AC1: sidebar source files hold no league literals', () => {
  it('AC1: the source files were actually loaded', () => {
    for (const [name, text] of Object.entries(sources)) {
      expect({ name, long: text.length > 20 }).toEqual({ name, long: true })
    }
  })
  it('AC1: the literal list covers league ids, NFL stat keys, groups and labels', () => {
    expect(leagueValues()).toEqual(
      expect.arrayContaining(['nfl', 'NFL', 'passYds', 'Passing', 'Pass Yds', 'Offense', 'Win %']),
    )
  })
  it.each(Object.keys(sources))('AC1: %s has no quoted league value', (name) => {
    expect(findHits(sources[name])).toEqual([])
  })
  it('AC1: the scan would catch a planted literal', () => {
    expect(findHits(`${statSidebar}\nconst x = 'passYds'`)).toContain('passYds')
    expect(findHits(`${statGroup}\nconst y = "Passing"`)).toContain('Passing')
    expect(findHits(`${groupStats}\nconst z = "Pass Yds"`)).toContain('Pass Yds')
  })
})

describe('AC1: the sidebar reads data only through the provider context', () => {
  it.each(Object.keys(sources))('AC1: %s does not import data/ or MockProvider', (name) => {
    expect(sources[name]).not.toMatch(/['"][^'"]*\/data\//)
    expect(sources[name]).not.toContain('MockProvider')
  })
  it('AC1: useStatDefs gets the provider through the dataSource hook', () => {
    expect(useStatDefs).toContain('useDataProvider')
  })
})
