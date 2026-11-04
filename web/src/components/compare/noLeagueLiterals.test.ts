import { describe, expect, it } from 'vitest'
import { getLeagueRegistry } from '../../data/leagues'
import {
  NFL_SEASONS,
  ROSTER_UNITS,
  nflUiDefaults,
  playerStatDefs,
  teamStatDefs,
} from '../../data/nfl'
import barsChart from './BarsChart.tsx?raw'
import barsModel from './barsModel.ts?raw'
import chartPlaceholder from './ChartPlaceholder.tsx?raw'
import comparePanel from './ComparePanel.tsx?raw'
import compareTable from './CompareTable.tsx?raw'
import compareTableHelpers from './tableModel.ts?raw'
import emptyState from './EmptyState.tsx?raw'
import index from './index.ts?raw'

const sources: Record<string, string> = {
  'ComparePanel.tsx': comparePanel,
  'CompareTable.tsx': compareTable,
  'BarsChart.tsx': barsChart,
  'barsModel.ts': barsModel,
  'ChartPlaceholder.tsx': chartPlaceholder,
  'EmptyState.tsx': emptyState,
  'tableModel.ts': compareTableHelpers,
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

describe('AC28: compare source files hold no league literals', () => {
  it('AC28: the source files were actually loaded', () => {
    for (const [name, text] of Object.entries(sources)) {
      expect({ name, long: text.length > 20 }).toEqual({ name, long: true })
    }
  })
  it('AC28: the literal list covers league ids, NFL stat keys, groups and labels', () => {
    expect(leagueValues()).toEqual(
      expect.arrayContaining(['nfl', 'NFL', 'passYds', 'Passing', 'Pass Yds', 'Offense', 'Win %']),
    )
  })
  it.each(Object.keys(sources))('AC28: %s has no quoted league value', (name) => {
    expect(findHits(sources[name])).toEqual([])
  })
  it('AC28: the scan would catch a planted literal', () => {
    expect(findHits(`${comparePanel}\nconst x = 'passYds'`)).toContain('passYds')
    expect(findHits(`${compareTable}\nconst y = "Passing"`)).toContain('Passing')
    expect(findHits(`${compareTableHelpers}\nconst z = "Pass Yds"`)).toContain('Pass Yds')
    expect(findHits(`${barsChart}\nconst w = 'passYds'`)).toContain('passYds')
    expect(findHits(`${barsModel}\nconst v = "Passing"`)).toContain('Passing')
  })
})

describe('AC28: the compare panel reads data only through the existing hooks', () => {
  it.each(Object.keys(sources))('AC28: %s does not import data/ or MockProvider', (name) => {
    expect(sources[name]).not.toMatch(/['"][^'"]*\/data\//)
    expect(sources[name]).not.toContain('MockProvider')
  })
  it('AC28: ComparePanel uses useEntities and useStatDefs', () => {
    expect(comparePanel).toContain('useEntities')
    expect(comparePanel).toContain('useStatDefs')
  })
})
