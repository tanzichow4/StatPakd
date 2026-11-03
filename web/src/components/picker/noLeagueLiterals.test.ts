import { describe, expect, it } from 'vitest'
import { getLeagueRegistry } from '../../data/leagues'
import {
  NFL_SEASONS,
  ROSTER_UNITS,
  nflUiDefaults,
  playerStatDefs,
  teamStatDefs,
} from '../../data/nfl'
import activeLeague from '../../dataSource/activeLeague.ts?raw'
import useActiveLeagueId from '../../dataSource/useActiveLeagueId.ts?raw'
import addCard from './AddCard.tsx?raw'
import addPopover from './AddPopover.tsx?raw'
import entityCard from './EntityCard.tsx?raw'
import entityPicker from './EntityPicker.tsx?raw'
import filterEntities from './filterEntities.ts?raw'
import index from './index.ts?raw'
import useEntities from './useEntities.ts?raw'

const sources: Record<string, string> = {
  'EntityPicker.tsx': entityPicker,
  'EntityCard.tsx': entityCard,
  'AddCard.tsx': addCard,
  'AddPopover.tsx': addPopover,
  'useEntities.ts': useEntities,
  'filterEntities.ts': filterEntities,
  'index.ts': index,
  'dataSource/useActiveLeagueId.ts': useActiveLeagueId,
  'dataSource/activeLeague.ts': activeLeague,
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

describe('AC4: picker source files hold no league literals', () => {
  it('AC4: the source files were actually loaded', () => {
    for (const [name, text] of Object.entries(sources)) {
      expect({ name, long: text.length > 20 }).toEqual({ name, long: true })
    }
  })
  it('AC4: the literal list covers league ids, names, NFL values and positions', () => {
    expect(leagueValues()).toEqual(
      expect.arrayContaining([
        'nfl',
        'NFL',
        'nba',
        '2024',
        'passYds',
        'kc',
        'QB',
        'RB',
        'WR',
        'TE',
      ]),
    )
  })
  it.each(Object.keys(sources))('AC4: %s has no quoted league value', (name) => {
    expect(findHits(sources[name])).toEqual([])
  })
  it('AC4: the scan would catch a planted literal', () => {
    expect(findHits(`${entityPicker}\nconst x = 'NFL'`)).toContain('NFL')
    expect(findHits(`${filterEntities}\nconst y = "QB"`)).toContain('QB')
    expect(findHits(`${useEntities}\nconst z = "2024"`)).toContain('2024')
  })
})

describe('AC1: the picker reads data only through the provider context', () => {
  it.each(Object.keys(sources))('AC1: %s does not import data/ or MockProvider', (name) => {
    expect(sources[name]).not.toMatch(/['"][^'"]*\/data\//)
    expect(sources[name]).not.toContain('MockProvider')
  })
  it('AC1: useEntities gets the provider through the dataSource hook', () => {
    expect(useEntities).toContain('useDataProvider')
  })
  it('AC1: useActiveLeagueId gets the provider through the dataSource hook', () => {
    expect(useActiveLeagueId).toContain('useDataProvider')
  })
})
