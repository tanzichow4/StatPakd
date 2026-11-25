import { describe, expect, it } from 'vitest'
import { getLeagueRegistry } from '../../data/leagues'
import {
  NFL_SEASONS,
  ROSTER_UNITS,
  nflUiDefaults,
  playerStatDefs,
  teamStatDefs,
} from '../../data/nfl'
import globalNav from './GlobalNav.tsx?raw'
import useNavData from './useNavData.ts?raw'

const sources: Record<string, string> = {
  'GlobalNav.tsx': globalNav,
  'useNavData.ts': useNavData,
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
    ...playerStatDefs().flatMap((s) => [s.key, s.group]),
    ...teamStatDefs().flatMap((s) => [s.key, s.group]),
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

describe('AC4: nav source files hold no league literals', () => {
  it('AC4: the source files were actually loaded', () => {
    for (const [name, text] of Object.entries(sources)) {
      expect({ name, long: text.length > 20 }).toEqual({ name, long: true })
    }
  })
  it('AC4: the literal list covers league ids, names and NFL values', () => {
    expect(leagueValues()).toEqual(
      expect.arrayContaining(['nfl', 'NFL', 'nba', 'NBA', 'mlb', 'nhl', '2024', 'passYds', 'kc']),
    )
  })
  it.each(Object.keys(sources))('AC4: %s has no quoted league value', (name) => {
    expect(findHits(sources[name])).toEqual([])
  })
  it('AC4: the scan would catch a planted literal', () => {
    expect(findHits(`${globalNav}\nconst x = 'NFL'`)).toContain('NFL')
    expect(findHits(`${useNavData}\nconst y = "2024"`)).toContain('2024')
  })
})

describe('AC2: nav reads data only through the provider context', () => {
  it.each(Object.keys(sources))('AC2: %s does not import data/ or MockProvider', (name) => {
    expect(sources[name]).not.toMatch(/['"][^'"]*\/data\//)
    expect(sources[name]).not.toContain('MockProvider')
  })
  it('AC2: useNavData gets the provider through the dataSource hook', () => {
    expect(useNavData).toContain('useDataProvider')
  })
})
