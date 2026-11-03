# Plan: T04 Mock NFL data and provider

Sources: `docs/tickets/T04-mock-nfl-data.md`, `docs/plans/00-requirements.md` (contract, assumptions A1 to
A11), T03 types in `web/src/domain/types.ts` and `web/src/domain/provider.ts`, and the design script
`design_handoff_statpakd/design/StatPakd App.dc.html` lines 196-326.

## 1. Goal and out of scope

**Goal.** Port the design's sample NFL data and builder logic (including the deterministic hash-based
variation for 2023 and 2022) into `web/src/data/nfl/`, producing T03 `Entity`, `RosterEntry`, `StatDef` and
`League` shapes. Expose it through a `MockProvider` in `web/src/data/mockProvider.ts` that implements
`DataProvider`, so later UI tickets can run entirely on sample data.

**Out of scope** (from requirements):
- Formatting, best-of, range and normalization utilities (T05); app state, reducer, context or provider hook
  (T06).
- Any UI, including rendering the sample-data label, "Soon" tags, or wiring `MockProvider` into `App`.
- `OFF_COLS`, `DEF_COLS`, `OFF_SHARE`, `DEF_SHARE`, `ORDER`, `POS`, `COLORS`/`MAX`, the per-row colour index
  `i`.
- Real data, the Python API, the API provider, runtime validation (T21 to T23).
- Team entities or rosters for CIN, WAS, ATL, DAL, LV.
- Changes to `web/src/domain/`, tsconfig, lint config or package dependencies.
- Simulated latency or loading states in the mock provider.

## 2. Acceptance criteria

AC1 to AC12 are copied word for word in meaning from `00-requirements.md`; see that file for the full
reference values. Short form here, same numbers:

- **AC1 2024 values match the design.** At least 5 players (at least one each of QB, RB, WR, TE) and 3
  teams equal the design output for `'2024'`, including derived stats. Reference: Barkley (rushYds 2005,
  rushTd 13, ypc 5.8, rec 33, recYds 278, recTd 2, ypr 8.4, scrim 2283, totTd 15, passYds `null`); Allen
  (passYds 3731, passTd 28, int 6, cmp 63.6, rate 101.4, rushYds 531, ypc 5.2, rec/recYds/recTd/ypr `null`,
  scrim 531, totTd 12); KC (ppg 22.6, ypg 335.6, pass 225.0, rush 110.6, papg 19.2, to -1, third 47.4,
  win 88.2, wins 15, meta `AFC West · 15–2` with U+00B7 and U+2013).
- **AC2 Deterministic.** Builders called twice with the same args are deeply equal for every season, team
  and unit; provider methods likewise. No `Math.random`, `Date` or other non-deterministic input.
- **AC3 Nulls.** Every season: QBs have `rec`, `recYds`, `recTd`, `ypr`, `tgt`, `recYpg` `null`; `ypc` is
  `null` iff carries < 30; `ypr` is `null` iff receptions < 10 or `null`; non-QBs have `passYds`, `passTd`,
  `int`, `cmp`, `rate`, `passYpg`, `tdInt` `null`. `null` is never replaced by `0`.
- **AC4 Sample-data label.** Exactly one exported string constant outside `web/src/domain/`, non-empty,
  value `Sample data for design purposes.` (A9); a test imports and asserts it.
- **AC5 Data ported.** `RAW_P` (17), `RAW_T` (8), `ROSTERS` (8 teams, `off` 7 and `def` 5 each), `OFF_T`,
  `DEF_T`, `STATS` (22 player, 13 team defs) with design values, under `web/src/data/nfl/`.
- **AC6 2023/2022 variation.** For each of `'2023'` and `'2022'`, at least 3 player stats, 3 team stats
  (including `to` and `win`) and 2 roster stats equal the design's `rnd`/`vary`/`J` output, and at least one
  differs from 2024. Team `win` <= 100, roster `snap` <= 100.
- **AC7 Output shapes.** Type-check as T03 types without `any`/`unknown` casts. Player, team, roster row and
  stat def field mappings exactly as listed in the requirements (`short` to `shortName`, position as
  `badge`, `teamId` lowercased abbreviation, `meta` formats, roster `position` with digit removed, `number`,
  offense keys `snap touch tgt scrim td ypt`, defense keys `snap tkl sk int pd ff take`; `k/g/dec/low/sign/
  extra` to `key/group/decimals/lowerIsBetter/signed/extra` in design order).
- **AC8 League registry.** `getLeagues()` resolves to NFL, NBA, MLB, NHL in that order; only NFL enabled.
- **AC9 Provider.** `MockProvider` implements `DataProvider` (type-checked); `getSeasons`,
  `getStatDefs`, `getEntities`, `getRoster` behave as listed; disabled/unknown inputs per A6.
- **AC10 Fresh data per call.** Mutating a returned object does not affect a later call.
- **AC11 Tests.** Vitest tests under `web/src/data/` cover AC1 to AC10, with committed snapshot files for at
  least one player, one team and one roster row.
- **AC12 Quality gates and boundaries.** `npm test`, `npm run lint`, `npm run typecheck`,
  `npm run format:check` pass; `web/src/domain/` unchanged; no test removed or weakened; changes limited to
  `web/src/data/**` and optionally `docs/progress.md`.

Added:
- **AC13 (added) 2024 roster values match the design.** AC1 covers only players and teams, AC6 only the
  varied seasons, so 2024 roster output is otherwise only snapshot-tested. A test asserts the non-hashed
  stats for rows whose name is in `RAW_P`, for `'2024'`: `buf` `off` "Josh Allen" has touch 102, tgt 0,
  scrim 531, td 12, ypt 5.2; `phi` `off` "Saquon Barkley" has touch 378, tgt 47, scrim 2283, td 15, ypt 6.0.
  `snap` and all defense values come from `J`, so they are checked through design-computed literals (AC6
  method) or the snapshot.

## 3. Architecture

**Approach.** A faithful, typed port (A1). Raw data stays in design form (tuples and records) so it can be
diffed against the design; builders convert to T03 shapes. All builder output is constructed fresh on each
call, which gives AC10 for free. The provider is a thin async wrapper that validates ids and delegates.

**Files (all new, all under `web/src/data/`):**

| File | Contents |
| --- | --- |
| `sampleData.ts` | `export const SAMPLE_DATA_LABEL = 'Sample data for design purposes.'` (AC4, the only such constant). |
| `nfl/raw.ts` | `RAW_P`, `RAW_T`, `ROSTERS`, `OFF_T`, `DEF_T` with explicit readonly types (e.g. `RawPlayer` tuple with a `RawPlayerBase` object of optional `pa ptd int cmp rate ra ry rtd rec rcy rctd`; `RawTeam` tuple with an 8-number array; `ROSTERS: Record<string, { off: RosterRow[]; def: RosterRow[] }>`). Values copied verbatim, including `"Za'Darius Smith"` and `69.0`/`225.0`/`41.0`. |
| `nfl/statDefs.ts` | Player and team defs stored directly as `readonly StatDef[]` in design order, optional fields only when set (A7). Export `playerStatDefs()` / `teamStatDefs()` returning fresh copies (`map(d => ({ ...d }))`). |
| `nfl/variation.ts` | `RATE`, `rnd(str)` (FNV-1a: seed 2166136261, `for (const c of str)`, `h ^= c.charCodeAt(0)`, `Math.imul(h, 16777619)`, `((h >>> 0) % 10000) / 10000`), `vary(id, season, key, v, isInt)`, `round1(v)`. Copied exactly, including the `to` branch and `season === '2024'` early return. |
| `nfl/builders.ts` | `NFL_SEASONS = ['2024', '2023', '2022'] as const`, `ROSTER_UNITS = ['off', 'def'] as const`, `buildPlayers(season): Entity[]`, `buildTeams(season): Entity[]`, `buildRoster(teamId, unit, season): RosterEntry[]`. Pure and synchronous (A10). Throw `Error` for unknown season, team or unit. |
| `nfl/index.ts` | Re-exports the NFL module's public surface. |
| `leagues.ts` | `getLeagueRegistry(): League[]` returning fresh `[{id:'nfl',name:'NFL',enabled:true}, nba, mlb, nhl disabled]` (A5, AC8). |
| `mockProvider.ts` | `export class MockProvider implements DataProvider` (no parameter properties: `erasableSyntaxOnly` is on). |

**Builder details that must match the design (A1):**
- Players: `V(k, isInt = true)` uses `vary(id, season, k, base[k], isInt)`; `cmp` and `rate` use
  `isInt = false`. QB gates: `rec/rcy/rctd` null for QBs; passing stats null for non-QBs. `ypc` when
  carries `>= 30`; `ypr` when `rec >= 10` (null rec gives null); `scrim = ry + (rcy ?? 0)`,
  `totTd = rtd + (rctd ?? 0)`; extras `passYpg = r(passYds / 17)`, `tdInt = r(passTd / max(int, 1))`,
  `carries`, `rushYpg`, `tgt = round(rec / 0.7)` for non-QBs, `recYpg`, `touches = ra + (rec ?? 0)`,
  `ypt` when touches `>= 20`. Output stat keys in the `STATS.players` order is not required but all 22 keys
  must be present.
- Typing without casts: raw base fields are optional; `vary` returns `number | null` for an absent value.
  Where the design relies on a field being present (QB `pa`, every player's `ra`, `ry`, `rtd`), use a small
  `required(value, label)` helper that throws if absent rather than `!` or `as`. The data guarantees it
  never throws; a test covers that by building every season.
- Teams: vary the 8 keys in design order (`to` as int), `win = Math.min(100, win)`,
  `wins = round(win * 17 / 100)`, `totPts`, `passPct`, `yapg` (uses `rnd(id + season + 'ya')`), `pdiff`;
  `meta = div + ' · ' + w + '–' + (17 - w)`; `badge` and `shortName` are the abbreviation; no `position`,
  no `teamId`.
- Roster: `position = role.replace(/\d/, '')`, `key = name + season`, `J(k, v, lo = 0.7, sp = 0.5)`.
  Offense: template from `OFF_T[role]`; if a `RAW_P` player has the same name, use their real base
  (`?? 0` for absent fields, matching `|| 0` since values are numbers or absent) and, outside 2024, apply
  `J(k, v, 0.75, 0.4)`; round every base value; `snap = min(100, round(J('snap', t.snap, 0.9, 0.12)))`;
  `ypt = touch ? round1(scrim / touch) : null` (note: not the player `>= 20` rule). Defense: `tkl sk int pd
  ff` with `J(k, v, 0.6, 0.8)` rounded, `snap` as offense, `take = int + ff`. `id` per A4:
  `` `${teamId}-${unit}-${index}` `` (unique across the dataset). `number` is the shirt number.
- No `big`, `tile`, `abbr` or `i` fields in output (A5, out of scope).

**Provider behaviour (A6):** `getLeagues` resolves to the registry. Every other method first resolves the
league: unknown id rejects with `Error`; known but disabled resolves `[]`. For NFL: `getSeasons` gives a
fresh copy of `NFL_SEASONS`; `getStatDefs` delegates by kind; `getEntities` and `getRoster` reject on an
unknown season, team id or unit, otherwise delegate to the builders. Implement methods as `async` so
builder throws become rejections, never synchronous throws.

**Data and API changes:** none outside `web/src/data/`. `web/src/domain/` is untouched.

**Dependencies:** none added.

## 4. Design

There is no UI in this ticket. The "user" is a later UI ticket consuming `DataProvider`.
- **Flow:** consumer calls `getLeagues`, picks the enabled league, then `getSeasons`, `getStatDefs`,
  `getEntities`, `getRoster`.
- **States the provider makes possible:** success (data arrays), empty (`[]` for disabled leagues), error
  (rejection with `Error` and a message naming the bad input, e.g. `Unknown season: 2019`). Loading exists
  only as a pending promise; no artificial latency (out of scope).
- **Mobile and desktop:** not applicable (no rendering).
- **Accessibility:** not applicable here. The label text in `SAMPLE_DATA_LABEL` is plain sentence text so a
  later UI can render it as visible text, not just an icon. Team `meta` uses U+00B7 and U+2013 exactly as the
  design; screen readers read these acceptably.

## 5. Risk and security

- **Input validation:** provider inputs are strings from app state. Unknown league, season, team and unit
  are rejected with `Error` (A6). Lookups use `Object.hasOwn` / array `includes`, not bare indexing, so a
  `teamId` such as `__proto__` or `toString` cannot hit prototype properties. Task T6 includes these cases.
- **Auth:** none; static in-memory sample data.
- **Data exposure:** only public-style sample names and fake numbers; the label constant makes clear the
  data is sample data (`docs/plan.md`: do not present it as real).
- **Failure modes and safeguards:**
  - Drift from the design (wrong rounding, hash, seed string or iteration order). Safeguard: reference
    literals computed from the design script itself (A11), not from the code under test (T5, T7).
  - Shared mutable state leaking between calls. Safeguard: builders and def getters return new objects;
    AC10 test mutates results and calls again (T6, T7).
  - Hidden `null` to `0` coercion (for example `||` or `?? 0` in the wrong place). Safeguard: AC3 test
    sweeps every player in every season (T5).
  - Non-determinism. Safeguard: AC2 test plus a grep-style check in review that `Math.random` and `Date`
    are absent from `web/src/data/`.
  - Casts hiding type errors. Safeguard: no `as any`, `as unknown`, or `!` in `web/src/data/`; reviewer
    checks; `const p: DataProvider = new MockProvider()` in tests.
  - Snapshot churn. Snapshots are small (one player, one team, one roster row per unit), so changes are
    reviewable.

## 6. Gaps check

- **Auth:** not applicable (no network, no user data).
- **Validation:** provider-level id and season checks (A6), prototype-safe lookups.
- **Error handling:** rejections with `Error` for unknown inputs; disabled leagues resolve `[]`; builders
  throw `Error` and the async provider turns that into a rejection.
- **Mobile:** not applicable (no UI).
- **Accessibility:** not applicable beyond plain-text label (section 4).
- **Config and env vars:** none needed; no `.env` changes.
- **Tests:** Vitest under `web/src/data/`, snapshot files committed in `__snapshots__/`; prettier does not
  format `.snap` files, so `format:check` is unaffected. Existing tests untouched.

## 7. Tasks

Each task is one commit. Export names and file paths in section 3 are the shared interface, so the
test-writer can start as soon as T1 lands.

| Task | Owner | Description | ACs |
| --- | --- | --- | --- |
| T1 | coder | Create `web/src/data/sampleData.ts` (label constant) and `web/src/data/nfl/raw.ts` (types plus verbatim `RAW_P`, `RAW_T`, `ROSTERS`, `OFF_T`, `DEF_T`). Data only. | AC4, AC5 |
| T2 | coder | `web/src/data/nfl/statDefs.ts` (22 + 13 `StatDef`s in design order, optional fields only when set, fresh-copy getters) and `web/src/data/leagues.ts` (registry getter). | AC5, AC7, AC8, AC10 |
| T3 | coder | `web/src/data/nfl/variation.ts` (`RATE`, `rnd`, `vary`, `round1`) and `web/src/data/nfl/builders.ts` (`NFL_SEASONS`, `ROSTER_UNITS`, `buildPlayers`, `buildTeams`, `buildRoster`, `required` helper), plus `nfl/index.ts`. | AC1, AC2, AC3, AC6, AC7, AC10, AC13 |
| T4 | coder | `web/src/data/mockProvider.ts`: `MockProvider implements DataProvider`, A6 validation, async delegation. | AC8, AC9, AC10 |
| T5 | test-writer (parallel with T2 to T4) | Compute reference literals by running the design script's lines 196-326 in Node from the scratchpad (outside the repo, A11): `rnd` for 2 to 3 seed strings; 2023 and 2022 values for at least 3 player stats, 3 team stats (incl. `to`, `win`) and 2 roster stats (incl. one `snap` and one defense stat); 2024 roster `snap` for one row. Record them as literals with a comment naming the source lines. | AC6, AC13 |
| T6 | test-writer (parallel with T3 to T4) | `web/src/data/nfl/data.test.ts`: AC4 label, AC5 counts and spot values, AC7 stat-def mapping and order (including absent optional fields), AC8 registry. `web/src/data/nfl/variation.test.ts`: `rnd`/`vary` against T5 literals, 2024 identity. | AC4, AC5, AC6, AC7, AC8 |
| T7 | test-writer (parallel with T3 to T4) | `web/src/data/nfl/builders.test.ts`: AC1 (Barkley, Allen, KC plus at least one WR, one TE, two more teams), AC2 for all seasons/teams/units, AC3 sweep, AC6 literals and win/snap caps, AC7 shapes (`meta`, `teamId`, `badge`, all 22/13 keys, roster keys, `RB1` to `RB`), AC10 mutation, AC13, unknown season/team/unit throw, and `toMatchSnapshot` for one player, one team, one `off` and one `def` roster row. | AC1, AC2, AC3, AC6, AC7, AC10, AC11, AC13 |
| T8 | test-writer (parallel with T4) | `web/src/data/mockProvider.test.ts`: `const p: DataProvider = new MockProvider()`; AC8; AC9 each method; A6 (disabled league gives `[]` on all four methods, unknown league/season/team/unit reject with `Error`, including `__proto__` team id); AC2 and AC10 through the provider; every method returns a Promise. | AC2, AC8, AC9, AC10, AC11 |
| T9 | coder | Run `npm test` (accept and commit new snapshot files after manually checking them against T5/AC1 values), `npm run lint`, `npm run typecheck`, `npm run format`, `npm run format:check`; confirm `git diff --stat` touches only `web/src/data/**` (and optionally `docs/progress.md`). Fix only implementation, never tests. | AC11, AC12 |

Parallelism: T1 must land first. Then the coder does T2, T3, T4 in order while the test-writer does T5,
then T6, T7, T8 against the agreed export names. Tests may fail until the matching coder task lands; T9
gates the merge.

## 8. Open questions (defaults recorded, none block)

1. Unknown ids or seasons: reject (A6, chosen) or resolve `[]`? Affects error handling in T06 and T23.
2. Should the label say more than the design footer, for example that 2023 and 2022 are generated (A9)?
3. Should player `teamId` only point at existing team entities, and should CIN, WAS, ATL, DAL, LV get team
   entities (A3)?
4. Should roster column and share definitions be served through `DataProvider` (matters for T16, T17,
   T22)?
5. Roster `id` format (`<team>-<unit>-<index>`, A4): acceptable, or should rows reuse player ids when the
   name matches a `RAW_P` entry (so roster and player views can link)?
