import type { Entity, RosterEntry, StatMap } from '../../domain/types'
import { DEF_T, OFF_T, RAW_P, RAW_T, ROSTERS } from './raw'
import { rnd, round1, vary } from './variation'

export const NFL_SEASONS = ['2024', '2023', '2022'] as const
export const ROSTER_UNITS = ['off', 'def'] as const

function required(value: number | null | undefined, label: string): number {
  if (value == null) throw new Error(`Missing required value: ${label}`)
  return value
}

function assertSeason(season: string): void {
  if (!NFL_SEASONS.some((s) => s === season)) throw new Error(`Unknown season: ${season}`)
}

/** Build every player entity for a season. Returns fresh objects on each call. */
export function buildPlayers(season: string): Entity[] {
  assertSeason(season)
  return RAW_P.map(([id, name, short, team, pos, num, b]) => {
    const V = (k: keyof typeof b, isInt = true): number | null => vary(id, season, k, b[k], isInt)
    const isQB = pos === 'QB'
    const ra = required(V('ra'), `${id}.ra`)
    const ry = required(V('ry'), `${id}.ry`)
    const rtd = required(V('rtd'), `${id}.rtd`)
    const rec = isQB ? null : V('rec')
    const rcy = isQB ? null : V('rcy')
    const rctd = isQB ? null : V('rctd')
    const passYds = isQB ? required(V('pa'), `${id}.pa`) : null
    const passTd = isQB ? required(V('ptd'), `${id}.ptd`) : null
    const int = isQB ? required(V('int'), `${id}.int`) : null
    const scrim = ry + (rcy ?? 0)
    const touches = ra + (rec ?? 0)
    const stats: StatMap = {
      passYds,
      passTd,
      int,
      cmp: isQB ? required(V('cmp', false), `${id}.cmp`) : null,
      rate: isQB ? required(V('rate', false), `${id}.rate`) : null,
      rushYds: ry,
      rushTd: rtd,
      ypc: ra >= 30 ? round1(ry / ra) : null,
      rec,
      recYds: rcy,
      recTd: rctd,
      ypr: rec != null && rcy != null && rec >= 10 ? round1(rcy / rec) : null,
      scrim,
      totTd: rtd + (rctd ?? 0),
      passYpg: passYds != null ? round1(passYds / 17) : null,
      tdInt: passTd != null && int != null ? round1(passTd / Math.max(int, 1)) : null,
      carries: ra,
      rushYpg: round1(ry / 17),
      tgt: rec != null ? Math.round(rec / 0.7) : null,
      recYpg: rcy != null ? round1(rcy / 17) : null,
      touches,
      ypt: touches >= 20 ? round1(scrim / touches) : null,
    }
    return {
      id,
      name,
      shortName: short,
      meta: team + ' · ' + pos + ' · #' + num,
      badge: pos,
      position: pos,
      teamId: team.toLowerCase(),
      stats,
    }
  })
}

/** Build every team entity for a season. Returns fresh objects on each call. */
export function buildTeams(season: string): Entity[] {
  assertSeason(season)
  const keys = ['ppg', 'ypg', 'pass', 'rush', 'papg', 'to', 'third', 'win'] as const
  return RAW_T.map(([id, name, abbr, div, a]) => {
    const v: Record<(typeof keys)[number], number> = {
      ppg: 0,
      ypg: 0,
      pass: 0,
      rush: 0,
      papg: 0,
      to: 0,
      third: 0,
      win: 0,
    }
    keys.forEach((k, i) => {
      v[k] = required(vary(id, season, k, a[i], k === 'to'), `${id}.${k}`)
    })
    v.win = Math.min(100, v.win)
    const w = Math.round((v.win * 17) / 100)
    const stats: StatMap = {
      ...v,
      totPts: Math.round(v.ppg * 17),
      passPct: round1((v.pass / v.ypg) * 100),
      yapg: round1(v.papg * 15.2 + rnd(id + season + 'ya') * 40 - 20),
      pdiff: round1(v.ppg - v.papg),
      wins: w,
    }
    return {
      id,
      name,
      shortName: abbr,
      meta: div + ' · ' + w + '–' + (17 - w),
      badge: abbr,
      stats,
    }
  })
}

/** Build the roster of one team unit for a season. Returns fresh objects on each call. */
export function buildRoster(teamId: string, unit: string, season: string): RosterEntry[] {
  assertSeason(season)
  if (!Object.hasOwn(ROSTERS, teamId)) throw new Error(`Unknown team: ${teamId}`)
  const team = ROSTERS[teamId]
  if (unit !== 'off' && unit !== 'def') throw new Error(`Unknown unit: ${unit}`)
  return team[unit].map(([name, role, num], i): RosterEntry => {
    const position = role.replace(/\d/, '')
    const key = name + season
    const J = (k: string, v: number, lo = 0.7, sp = 0.5): number => v * (lo + sp * rnd(key + k))
    const id = `${teamId}-${unit}-${i}`
    if (unit === 'off') {
      if (!Object.hasOwn(OFF_T, role)) throw new Error(`Unknown role: ${role}`)
      const t = OFF_T[role]
      const real = RAW_P.find((p) => p[1] === name)
      let b = {
        ca: J('ca', t.ca),
        ry: J('ry', t.ry),
        rtd: J('rtd', t.rtd),
        rec: J('rec', t.rec),
        rcy: J('rcy', t.rcy),
        rctd: J('rctd', t.rctd),
      }
      if (real) {
        const s = real[6]
        b = {
          ca: s.ra ?? 0,
          ry: s.ry ?? 0,
          rtd: s.rtd ?? 0,
          rec: s.rec ?? 0,
          rcy: s.rcy ?? 0,
          rctd: s.rctd ?? 0,
        }
        if (season !== '2024') {
          b = {
            ca: J('ca', b.ca, 0.75, 0.4),
            ry: J('ry', b.ry, 0.75, 0.4),
            rtd: J('rtd', b.rtd, 0.75, 0.4),
            rec: J('rec', b.rec, 0.75, 0.4),
            rcy: J('rcy', b.rcy, 0.75, 0.4),
            rctd: J('rctd', b.rctd, 0.75, 0.4),
          }
        }
      }
      const ca = Math.round(b.ca)
      const ry = Math.round(b.ry)
      const rtd = Math.round(b.rtd)
      const rec = Math.round(b.rec)
      const rcy = Math.round(b.rcy)
      const rctd = Math.round(b.rctd)
      const touch = ca + rec
      const scrim = ry + rcy
      return {
        id,
        name,
        position,
        number: num,
        stats: {
          snap: Math.min(100, Math.round(J('snap', t.snap, 0.9, 0.12))),
          touch,
          tgt: Math.round(rec / 0.7),
          scrim,
          td: rtd + rctd,
          ypt: touch ? round1(scrim / touch) : null,
        },
      }
    }
    if (!Object.hasOwn(DEF_T, role)) throw new Error(`Unknown role: ${role}`)
    const t = DEF_T[role]
    const tkl = Math.round(J('tkl', t.tkl, 0.6, 0.8))
    const sk = Math.round(J('sk', t.sk, 0.6, 0.8))
    const int = Math.round(J('int', t.int, 0.6, 0.8))
    const pd = Math.round(J('pd', t.pd, 0.6, 0.8))
    const ff = Math.round(J('ff', t.ff, 0.6, 0.8))
    return {
      id,
      name,
      position,
      number: num,
      stats: {
        snap: Math.min(100, Math.round(J('snap', t.snap, 0.9, 0.12))),
        tkl,
        sk,
        int,
        pd,
        ff,
        take: int + ff,
      },
    }
  })
}
