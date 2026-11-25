import { describe, expect, it } from 'vitest'
import { getLeagueRegistry } from '../../data/leagues'
import { nflUiDefaults } from '../../data/nfl'
import announcer from './Announcer.tsx?raw'
import announceContext from './announceContext.ts?raw'
import index from './index.ts?raw'
import useAnnounce from './useAnnounce.ts?raw'

const sources: Record<string, string> = {
  'Announcer.tsx': announcer,
  'announceContext.ts': announceContext,
  'useAnnounce.ts': useAnnounce,
  'index.ts': index,
}

const values = () => {
  const d = nflUiDefaults()
  return [d.season, ...getLeagueRegistry().flatMap((l) => [l.id, l.name]), 'QB', 'RB', 'WR', 'TE']
}

describe('a11y source files hold no league literals', () => {
  it.each(Object.keys(sources))('%s has no quoted league value', (name) => {
    expect(sources[name].length).toBeGreaterThan(20)
    const hits = values().filter((v) =>
      [`'${v}'`, `"${v}"`, `\`${v}\``].some((q) => sources[name].includes(q)),
    )
    expect(hits).toEqual([])
  })
})
