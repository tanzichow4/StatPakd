import { rnd } from './variation'

/** Games each team plays in a season. */
export const GAMES = 17

export interface GameSnaps {
  /** Plays the player was on the field for. */
  snaps: number
  /** Plays the team's unit ran. */
  teamSnaps: number
}

/** Share of snaps a position usually plays: [lowest, spread]. */
const SNAP_SHARE: Readonly<Record<string, readonly [number, number]>> = {
  QB: [0.95, 0.05],
  RB: [0.62, 0.14],
  WR: [0.8, 0.12],
  TE: [0.76, 0.14],
}

/** Sample snap counts for each game. Deterministic per player and season. */
export function gameSnaps(playerId: string, season: string, position: string): GameSnaps[] {
  const [low, spread] = Object.hasOwn(SNAP_SHARE, position) ? SNAP_SHARE[position] : [0.6, 0.2]
  const usual = low + spread * rnd(`${playerId}${season}share`)
  return Array.from({ length: GAMES }, (_, i) => {
    const key = `${playerId}${season}snaps${i}`
    const teamSnaps = 58 + Math.round(16 * rnd(`${key}team`))
    const share = Math.min(1, usual * (0.92 + 0.16 * rnd(key)))
    return { snaps: Math.round(teamSnaps * share), teamSnaps }
  })
}

/** Sample season pass attempts and completions that agree with the yards and completion rate. */
export function passVolume(
  playerId: string,
  season: string,
  passYards: number,
  completionPct: number,
): { attempts: number; completions: number } {
  const yardsPerAttempt = 6.8 + 1.4 * rnd(`${playerId}${season}ypa`)
  const near = Math.round(passYards / yardsPerAttempt)
  const completionsFor = (a: number) => Math.round((a * completionPct) / 100)
  const rate = (a: number) => Math.round((completionsFor(a) / a) * 1000) / 10
  // The nearest attempt count whose completions give back exactly the same percentage.
  let attempts = near
  for (let step = 1; rate(attempts) !== completionPct && step <= 100; step++) {
    attempts = rate(near + step) === completionPct ? near + step : near - step
  }
  return { attempts, completions: completionsFor(attempts) }
}
