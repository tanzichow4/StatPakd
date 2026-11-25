import { describe, expect, it } from 'vitest'
import { getLeagueRegistry } from '../../data/leagues'
import { NFL_SEASONS, buildPlayers, playerStatDefs } from '../../data/nfl'
import gameLogTable from './GameLogTable.tsx?raw'
import playerDetail from './PlayerDetail.tsx?raw'
import playerModeSwitch from './PlayerModeSwitch.tsx?raw'
import playerPicker from './PlayerPicker.tsx?raw'
import trendChart from './TrendChart.tsx?raw'
import weekCompare from './WeekCompare.tsx?raw'
import headerModel from './headerModel.ts?raw'
import index from './index.ts?raw'
import playerModel from './playerModel.ts?raw'
import useGameLog from './useGameLog.ts?raw'

const sources: Record<string, string> = {
  'GameLogTable.tsx': gameLogTable,
  'PlayerDetail.tsx': playerDetail,
  'PlayerModeSwitch.tsx': playerModeSwitch,
  'PlayerPicker.tsx': playerPicker,
  'TrendChart.tsx': trendChart,
  'WeekCompare.tsx': weekCompare,
  'headerModel.ts': headerModel,
  'index.ts': index,
  'playerModel.ts': playerModel,
  'useGameLog.ts': useGameLog,
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

describe('player detail source files hold no league literals', () => {
  it.each(Object.keys(sources))('%s has no quoted league value', (name) => {
    expect(sources[name].length).toBeGreaterThan(20)
    expect(findHits(sources[name])).toEqual([])
  })

  it.each(Object.keys(sources))('%s does not import data/ or MockProvider', (name) => {
    expect(sources[name]).not.toMatch(/['"][^'"]*\/data\//)
    expect(sources[name]).not.toContain('MockProvider')
  })

  it('would catch a planted literal', () => {
    expect(findHits("const a = 'passYds'")).toEqual(['passYds'])
  })
})
