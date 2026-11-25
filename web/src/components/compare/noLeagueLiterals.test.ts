import { describe, expect, it } from 'vitest'
import { getLeagueRegistry } from '../../data/leagues'
import {
  NFL_SEASONS,
  ROSTER_UNITS,
  nflUiDefaults,
  playerStatDefs,
  teamStatDefs,
} from '../../data/nfl'
import axisControls from './AxisControls.tsx?raw'
import barsChart from './BarsChart.tsx?raw'
import barsModel from './barsModel.ts?raw'
import chart3d from './Chart3D.tsx?raw'
import chart3dModel from './chart3dModel.ts?raw'
import chartPlaceholder from './ChartPlaceholder.tsx?raw'
import comparePanel from './ComparePanel.tsx?raw'
import compareTable from './CompareTable.tsx?raw'
import compareTableHelpers from './tableModel.ts?raw'
import dotPlot from './DotPlot.tsx?raw'
import dotsModel from './dotsModel.ts?raw'
import emptyState from './EmptyState.tsx?raw'
import index from './index.ts?raw'
import radarChart from './RadarChart.tsx?raw'
import radarModel from './radarModel.ts?raw'
import seasonDotGraph from './SeasonDotGraph.tsx?raw'
import seasonDotModel from './seasonDotModel.ts?raw'
import readout from './Readout.tsx?raw'

const sources: Record<string, string> = {
  'ComparePanel.tsx': comparePanel,
  'CompareTable.tsx': compareTable,
  'BarsChart.tsx': barsChart,
  'barsModel.ts': barsModel,
  'DotPlot.tsx': dotPlot,
  'SeasonDotGraph.tsx': seasonDotGraph,
  'seasonDotModel.ts': seasonDotModel,
  'dotsModel.ts': dotsModel,
  'ChartPlaceholder.tsx': chartPlaceholder,
  'RadarChart.tsx': radarChart,
  'radarModel.ts': radarModel,
  'EmptyState.tsx': emptyState,
  'tableModel.ts': compareTableHelpers,
  'index.ts': index,
  'chart3dModel.ts': chart3dModel,
  'AxisControls.tsx': axisControls,
  'Readout.tsx': readout,
  'Chart3D.tsx': chart3d,
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
  it('AC21: the scan would catch a planted literal in the radar files', () => {
    expect(findHits(`${radarChart}\nconst a = 'passYds'`)).toContain('passYds')
    expect(findHits(`${radarChart}\nconst b = "Pass Yds"`)).toContain('Pass Yds')
    expect(findHits(`${radarModel}\nconst c = "Passing"`)).toContain('Passing')
    expect(findHits(`${radarModel}\nconst d = \`nfl\``)).toContain('nfl')
  })
})

describe('AC28: the compare panel reads data only through the existing hooks', () => {
  it.each(Object.keys(sources))('AC28: %s does not import data/ or MockProvider', (name) => {
    expect(sources[name]).not.toMatch(/['"][^'"]*\/data\//)
    expect(sources[name]).not.toContain('MockProvider')
  })
  it('AC37: Chart3D takes its data from props and imports nothing from data/', () => {
    expect(chart3d).not.toMatch(/from\s+['"][^'"]*data\//)
    expect(chart3d).not.toContain('MockProvider')
    expect(chart3dModel).not.toMatch(/from\s+['"][^'"]*data\//)
  })
  it('AC28: ComparePanel uses useEntities and useStatDefs', () => {
    expect(comparePanel).toContain('useEntities')
    expect(comparePanel).toContain('useStatDefs')
  })
})
