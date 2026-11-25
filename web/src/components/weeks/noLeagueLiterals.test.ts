import { describe, expect, it } from 'vitest'
import { getLeagueRegistry } from '../../data/leagues'
import { NFL_SEASONS, buildPlayers, playerStatDefs } from '../../data/nfl'
import playerViewSwitch from './PlayerViewSwitch.tsx?raw'
import totalsPanel from './TotalsPanel.tsx?raw'
import weekSelector from './WeekSelector.tsx?raw'
import weekTable from './WeekTable.tsx?raw'
import weekView from './WeekView.tsx?raw'
import index from './index.ts?raw'
import useGameLogs from './useGameLogs.ts?raw'
import weekModel from './weekModel.ts?raw'
import dotGraph from '../dotgraph/DotGraph.tsx?raw'
import graphModel from '../dotgraph/graphModel.ts?raw'
import scale from '../dotgraph/scale.ts?raw'
import rollup from '../../lib/rollup.ts?raw'

const sources: Record<string, string> = {
  'PlayerViewSwitch.tsx': playerViewSwitch,
  'TotalsPanel.tsx': totalsPanel,
  'WeekSelector.tsx': weekSelector,
  'WeekTable.tsx': weekTable,
  'WeekView.tsx': weekView,
  'index.ts': index,
  'useGameLogs.ts': useGameLogs,
  'weekModel.ts': weekModel,
  'DotGraph.tsx': dotGraph,
  'graphModel.ts': graphModel,
  'scale.ts': scale,
  'rollup.ts': rollup,
}

const leagueValues = [
  ...new Set([
    ...NFL_SEASONS,
    ...playerStatDefs().flatMap((s) => [s.key, s.group, s.label]),
    ...buildPlayers(NFL_SEASONS[0]).flatMap((p) => [p.id, p.name, p.badge]),
    ...getLeagueRegistry().flatMap((l) => [l.id, l.name]),
  ]),
]
const findHits = (text: string) =>
  leagueValues.filter((v) => [`'${v}'`, `"${v}"`, `\`${v}\``].some((q) => text.includes(q)))

describe('week view and dot graph source files hold no league literals', () => {
  it.each(Object.keys(sources))('%s has no quoted league value', (name) => {
    expect(sources[name].length).toBeGreaterThan(20)
    expect(findHits(sources[name])).toEqual([])
  })

  it.each(Object.keys(sources))('%s does not import data/ or MockProvider', (name) => {
    expect(sources[name]).not.toMatch(/['"][^'"]*\/data\//)
    expect(sources[name]).not.toContain('MockProvider')
  })

  it('would catch a planted literal', () => {
    expect(findHits("const a = 'snaps'")).toEqual(['snaps'])
  })
})
