import type { Entity, GameLogEntry, StatMap, StatValue } from '../../domain/types'
import { buildPlayers } from './builders'
import { rnd, round1 } from './variation'

/** Weeks in a season; each team has one of them off. */
export const WEEK_COUNT = 18
const FIRST_BYE = 5
const BYE_SPAN = 10

/** The week a team does not play. Deterministic per team and season. */
export function byeWeek(teamId: string, season: string): number {
  return FIRST_BYE + Math.floor(rnd(`${teamId}${season}bye`) * BYE_SPAN)
}

/**
 * Splits a whole number into whole parts in proportion to the weights, so the parts add up to the
 * total exactly. A part with zero weight gets nothing.
 */
export function distribute(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((a, w) => a + w, 0)
  if (sum <= 0) return weights.map(() => 0)
  const exact = weights.map((w) => (total * w) / sum)
  const parts = exact.map(Math.floor)
  let left = total - parts.reduce((a, v) => a + v, 0)
  const order = exact
    .map((v, i) => ({ i, rest: v - parts[i] }))
    .filter(({ i }) => weights[i] > 0)
    .sort((a, b) => b.rest - a.rest || a.i - b.i)
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) parts[order[k].i] += 1
  return parts
}

const ratio = (a: number, b: number): number | null => (b > 0 ? round1(a / b) : null)

/** Weekly stats of one player. Counting stats add up to the season totals. */
function weeklyStats(player: Entity, season: string, games: number): StatMap[] {
  const s = player.stats
  const roll = (key: string, i: number) => rnd(`${player.id}${season}${key}week${i}`)
  const slots = Array.from({ length: games }, (_, i) => i)

  /** Spreads a season total over the games; `base` limits which games can receive any. */
  const split = (key: string, base?: readonly number[]): number[] | null => {
    const total: StatValue | undefined = s[key]
    if (total == null) return null
    const weights = slots.map((i) => (base ? base[i] : 1) * (0.35 + 1.3 * roll(key, i)))
    return distribute(total, weights)
  }

  const passYds = split('passYds')
  const passTd = split('passTd')
  const int = split('int')
  const carries = split('carries')
  const rushYds = split('rushYds', carries ?? undefined)
  const rushTd = split('rushTd', carries ?? undefined)
  const rec = split('rec')
  const recYds = split('recYds', rec ?? undefined)
  const recTd = split('recTd', rec ?? undefined)
  // Every catch was a target, so only the incomplete targets are spread separately.
  const missed =
    rec && s.tgt != null && s.rec != null
      ? distribute(
          s.tgt - s.rec,
          slots.map((i) => 0.35 + 1.3 * roll('tgt', i)),
        )
      : null

  /** A rate that moves around the season value. */
  const around = (key: string, i: number, spread: number, max: number): number | null => {
    const v = s[key]
    return v == null ? null : round1(Math.min(max, v * (1 - spread + 2 * spread * roll(key, i))))
  }

  return slots.map((i) => {
    const ry = rushYds?.[i] ?? 0
    const rcy = recYds?.[i] ?? null
    const ca = carries?.[i] ?? 0
    const catches = rec?.[i] ?? null
    const scrim = ry + (rcy ?? 0)
    const touches = ca + (catches ?? 0)
    const td = passTd?.[i] ?? null
    const picks = int?.[i] ?? null
    return {
      passYds: passYds?.[i] ?? null,
      passTd: td,
      int: picks,
      cmp: around('cmp', i, 0.14, 100),
      rate: around('rate', i, 0.3, 158.3),
      tdInt: td != null && picks != null ? round1(td / Math.max(picks, 1)) : null,
      rushYds: ry,
      rushTd: rushTd?.[i] ?? 0,
      carries: ca,
      ypc: ratio(ry, ca),
      rec: catches,
      recYds: rcy,
      recTd: recTd?.[i] ?? null,
      tgt: catches != null && missed ? catches + missed[i] : null,
      ypr: catches != null && rcy != null ? ratio(rcy, catches) : null,
      scrim,
      totTd: (rushTd?.[i] ?? 0) + (recTd?.[i] ?? 0),
      touches,
      ypt: ratio(scrim, touches),
    }
  })
}

/** Sample week-by-week values for one player. Returns fresh objects on each call. */
export function buildGameLog(playerId: string, season: string): GameLogEntry[] {
  const player = buildPlayers(season).find((p) => p.id === playerId)
  if (!player) throw new Error(`Unknown player: ${playerId}`)
  const bye = byeWeek(player.teamId ?? playerId, season)
  const games = weeklyStats(player, season, WEEK_COUNT - 1)
  let next = 0
  return Array.from({ length: WEEK_COUNT }, (_, i): GameLogEntry => {
    const period = i + 1
    const played = period !== bye
    return {
      period,
      label: `Week ${period}`,
      shortLabel: `W${period}`,
      played,
      stats: played ? games[next++] : {},
    }
  })
}
