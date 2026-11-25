import { describe, expect, it } from 'vitest'
import { NFL_SEASONS, ROSTER_UNITS, nflUiDefaults, playerStatDefs, teamStatDefs } from '../data/nfl'
import appState from './appState.ts?raw'
import appStateContext from './appStateContext.ts?raw'
import appStateProvider from './AppStateProvider.tsx?raw'
import useAppState from './useAppState.ts?raw'

const sources: Record<string, string> = {
  'appState.ts': appState,
  'appStateContext.ts': appStateContext,
  'AppStateProvider.tsx': appStateProvider,
  'useAppState.ts': useAppState,
}

function leagueValues(): string[] {
  const d = nflUiDefaults()
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

describe('AC2: state source files hold no league literals', () => {
  it('AC2: the source files were actually loaded', () => {
    for (const [name, text] of Object.entries(sources)) {
      expect({ name, long: text.length > 20 }).toEqual({ name, long: true })
    }
  })
  it('AC2: the literal list covers the NFL values', () => {
    expect(leagueValues()).toEqual(
      expect.arrayContaining(['allen', 'passYds', 'phi', '2024', 'off', 'snap', 'kc']),
    )
  })
  it.each(Object.keys(sources))('AC2: %s has no quoted NFL value', (name) => {
    expect(findHits(sources[name])).toEqual([])
  })
  it('AC2: the scan would catch a planted literal', () => {
    expect(findHits(`${appState}\nconst x = 'passYds'`)).toContain('passYds')
  })
})
