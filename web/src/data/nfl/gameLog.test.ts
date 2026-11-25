import { describe, expect, it } from 'vitest'
import { MockProvider } from '../mockProvider'
import { NFL_SEASONS, buildPlayers } from './builders'
import { WEEK_COUNT, buildGameLog, byeWeek, distribute } from './gameLog'

const SUMMED = [
  'passYds',
  'passTd',
  'int',
  'carries',
  'rushYds',
  'rushTd',
  'rec',
  'recYds',
  'recTd',
  'tgt',
  'scrim',
  'totTd',
  'touches',
]

describe('distribute', () => {
  it('splits a total into whole parts that add up exactly', () => {
    const parts = distribute(100, [1, 2, 3])
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100)
    expect(parts.every(Number.isInteger)).toBe(true)
  })

  it('gives nothing to a zero weight', () => {
    expect(distribute(7, [0, 1, 0, 1])).toEqual([0, 4, 0, 3])
  })

  it('returns zeros when every weight is zero', () => {
    expect(distribute(5, [0, 0])).toEqual([0, 0])
  })
})

describe('buildGameLog', () => {
  const cases = NFL_SEASONS.flatMap((season) =>
    buildPlayers(season).map((p) => [season, p.id] as const),
  )

  it.each(cases)('%s %s has 18 weeks and one bye with no stats', (season, id) => {
    const player = buildPlayers(season).find((p) => p.id === id)!
    const log = buildGameLog(id, season)
    expect(log.map((e) => e.period)).toEqual(Array.from({ length: WEEK_COUNT }, (_, i) => i + 1))
    const byes = log.filter((e) => !e.played)
    expect(byes.map((e) => [e.period, e.stats])).toEqual([[byeWeek(player.teamId!, season), {}]])
  })

  it.each(cases)('%s %s weekly counting stats add up to the season totals', (season, id) => {
    const player = buildPlayers(season).find((p) => p.id === id)!
    const log = buildGameLog(id, season)
    // A stat the player does not have stays absent in every week, so its weekly sum is null.
    const sum = (key: string) =>
      log.every((e) => e.stats[key] == null)
        ? null
        : log.reduce((a, e) => a + (e.stats[key] ?? 0), 0)
    const totals = SUMMED.map((key) => [key, player.stats[key] ?? null])
    expect(SUMMED.map((key) => [key, sum(key)])).toEqual(totals)
  })

  it.each(cases)('%s %s never has impossible weeks', (season, id) => {
    const weeks = buildGameLog(id, season)
      .filter((e) => e.played)
      .map((e) => e.stats)
    const values = weeks.flatMap((w) => Object.values(w)).filter((v) => v !== null)
    expect(values.filter((v) => !Number.isFinite(v) || v < 0)).toEqual([])
    expect(
      weeks.filter((w) => w.carries === 0 && (w.rushYds !== 0 || w.rushTd !== 0 || w.ypc !== null)),
    ).toEqual([])
    expect(weeks.filter((w) => w.rec != null && !(w.tgt! >= w.rec))).toEqual([])
    expect(weeks.filter((w) => (w.cmp ?? 0) > 100)).toEqual([])
  })

  it('is deterministic and returns fresh objects', () => {
    const a = buildGameLog('allen', '2024')
    const b = buildGameLog('allen', '2024')
    expect(a).toEqual(b)
    expect(a[0]).not.toBe(b[0])
    expect(buildGameLog('allen', '2023')).not.toEqual(a)
  })

  it('labels each week', () => {
    expect(buildGameLog('allen', '2024')[2]).toMatchObject({ label: 'Week 3', shortLabel: 'W3' })
  })

  it('rejects an unknown player', () => {
    expect(() => buildGameLog('nobody', '2024')).toThrow('Unknown player: nobody')
  })
})

describe('MockProvider.getGameLog', () => {
  const provider = new MockProvider()

  it('resolves the weeks of a player', async () => {
    await expect(provider.getGameLog('nfl', 'allen', '2024')).resolves.toHaveLength(WEEK_COUNT)
  })

  it('resolves empty for a disabled league', async () => {
    await expect(provider.getGameLog('nba', 'allen', '2024')).resolves.toEqual([])
  })

  it('rejects an unknown league, season or player', async () => {
    await expect(provider.getGameLog('zzz', 'allen', '2024')).rejects.toThrow('Unknown league')
    await expect(provider.getGameLog('nfl', 'allen', '1999')).rejects.toThrow('Unknown season')
    await expect(provider.getGameLog('nfl', 'nobody', '2024')).rejects.toThrow('Unknown player')
  })
})
