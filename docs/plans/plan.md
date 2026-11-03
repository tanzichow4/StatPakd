# Plan: T05 Stat utilities (format, best, normalize)

Sources: `docs/tickets/T05-stat-utilities.md`, `docs/plans/00-requirements.md` (the contract,
assumptions A1 to A8), T03 types in `web/src/domain/types.ts`, T04 stat defs in
`web/src/data/nfl/statDefs.ts`, and the design script
`design_handoff_statpakd/design/StatPakd App.dc.html` lines 363-391 (`range`, `fmt`, `n01`, best-of,
bars `p`, radar `t`). I re-read lines 363-381 and they match the requirements' description.

Run mode: non-interactive. Recorded assumptions A1 to A8 count as decisions. The open questions in
section 8 do not block anything.

## 1. Goal and out of scope

**Goal.** Add pure, league-agnostic functions to `web/src/lib/stats.ts`: `formatStat`, `bestIndex`,
`leagueRange`, `normalize` and `barWidth`. For design-reachable inputs they must return exactly what
the design script returns. Table-driven tests in `web/src/lib/stats.test.ts` pin every behaviour and
give 100% branch, statement, function and line coverage on `stats.ts`.

**Out of scope** (from requirements):
- Using the functions in any component (table, bars, radar, 3D). Later tickets do that.
- Radar geometry (`0.08 + 0.92 * t`), 3D mapping (`2 * n01 - 1`), projection math.
- Team breakdown roster formatting and its best rule (`String(v)`, `'%'` suffix, `v > 0 && v === max`).
- Share bar percentages and leader text.
- Locale switching. Output is always `en-US`.
- A permanent coverage config or npm script (optional under A7; this plan does not add one, see T6).
- Any Python changes.

## 2. Acceptance criteria

Same numbers as `00-requirements.md`, short form. Reference values and wording are in that file. No ACs
added.

Formatting, `formatStat(value, def)`
- **AC1** `null` and `undefined` give `'—'` (U+2014) for any def.
- **AC2** Positive `decimals`: output equals `value.toFixed(decimals)` (`64.25`/1 gives `'64.3'`, `7`/1
  gives `'7.0'`, `1234.5`/1 gives `'1234.5'`, with no separator).
- **AC3** `decimals` absent or `0`: output equals `value.toLocaleString('en-US')` (`4806` gives
  `'4,806'`, `-1200` gives `'-1,200'`, `12.3456` gives `'12.346'`).
- **AC4** `signed`: positive values get a `'+'` prefix (`'+3'`, `'+2.5'` with decimals 1), negatives keep
  `'-'` (`'-1'`), and `0` gives `'0'`.
- **AC5** Not signed: no `'+'`.

Best-of, `bestIndex(values, def)`
- **AC6** Returns all best indices in ascending order, or an empty array when none is best.
- **AC7** Higher is better by default. With `lowerIsBetter`, the smallest value is best.
- **AC8** `null` and `undefined` are never best and are left out when choosing the best value.
- **AC9** Every index that is `===` the best value is returned (ties).
- **AC10** Fewer than 2 non-null values (including empty or all-null input) returns `[]`.

Range, `leagueRange(entities, key)`
- **AC11** Returns min and max of `stats[key]` over all entities, ignoring null and missing keys.
- **AC12** No non-null values, or an empty list: returns the defined "no range" result (`null`, see
  section 3) and never throws.

Normalize and bar width
- **AC13** `(value - min) / (max - min)`: min gives 0, max gives 1, midpoint gives 0.5.
- **AC14** `min === max` gives `0.5`, never `NaN` or `Infinity`.
- **AC15** A null or missing value gives `0`.
- **AC16** Opt-in inversion: when it is requested, `def.lowerIsBetter` is true and the value is non-null,
  the result is `1 - n` (min gives 1, max gives 0, `min === max` gives 0.5). Null still gives 0. No
  inversion when it is not requested or when `lowerIsBetter` is false.
- **AC17** `barWidth` is `Math.round((0.05 + 0.95 * n) * 100)`, using the non-inverted `n`: min gives
  5, max gives 100, `min === max` gives 53, null gives 0.
- **AC18** With "no range", normalize gives 0.5 for a non-null value and 0 for null. Bar width follows
  from that. No `NaN` or `Infinity`.

Cross-cutting
- **AC19** Outputs equal the design-script expressions for the same inputs. Tests include cases that use
  T04 stat defs (`int` and `papg` lower-is-better, `to` signed, `pdiff` signed with decimals 1).
- **AC20** Pure: no input mutation, no React, no league-specific keys in `stats.ts`. All functions are
  exported from `web/src/lib/stats.ts`.
- **AC21** Tests are table-driven. They cover nulls, ties, signed, lower-is-better, fewer than 2
  non-null values, and `min === max`. `stats.ts` has 100% coverage under (run from `web/`):
  `npx vitest run src/lib/stats.test.ts --coverage --coverage.include=src/lib/stats.ts --coverage.thresholds.100`
- **AC22** `npm test`, `npm run lint`, `npm run typecheck` and `npm run format:check` pass in `web/`.

## 3. Architecture

**Approach.** One new module, `web/src/lib/stats.ts`, next to the existing `cx.ts`. It has no runtime
imports, only `import type` from `../domain/types`. Each function is a small direct port of the
design expression, with explicit `== null` checks (A3: `undefined` is treated like `null`). There is no
shared state and no caching. `normalize` takes a precomputed range so callers compute `leagueRange`
once per stat.

**Public API** (names fixed by the ticket; parameter types are narrowed with `Pick` so callers can
pass any object that has the needed fields):

```ts
export type StatRange = { readonly min: number; readonly max: number } | null   // null = "no range" (A4)
export const NULL_PLACEHOLDER = '—'                                            // U+2014 (A8)

formatStat(value: StatValue | undefined, def: Pick<StatDef, 'decimals' | 'signed'>): string
bestIndex(values: ReadonlyArray<StatValue | undefined>, def: Pick<StatDef, 'lowerIsBetter'>): number[]
leagueRange(entities: ReadonlyArray<Pick<Entity, 'stats'>>, key: string): StatRange
normalize(value: StatValue | undefined, range: StatRange, def: Pick<StatDef, 'lowerIsBetter'>,
          options?: { invertLowerIsBetter?: boolean }): number
barWidth(value: StatValue | undefined, range: StatRange): number
```

Implementation notes for the builder:
- `formatStat`: test `def.decimals` for truthiness, not `!== undefined`, so that `decimals: 0` uses
  the `toLocaleString` path (A1). Add `'+'` only when `def.signed && value > 0`.
- `bestIndex`: one pass collects the non-null values. Return `[]` if fewer than 2. Compute the best
  with a loop or `Math.min/max` (the array is the selected entities, so it is small). A second pass
  collects indices where `v != null && v === best`. Do not sort or mutate the input.
- `leagueRange`: a loop tracks min and max and returns `null` when nothing was seen. Use a loop rather
  than spreading into `Math.min/max`, so large pools cannot overflow the argument limit.
- `normalize`: if the value is null, return 0. If the range is null, return 0.5 (AC18). If
  `max === min`, use 0.5; otherwise use `(v - min) / (max - min)`. If inversion is requested and
  `def.lowerIsBetter` is true, return `1 - n`. No clamping (A5).
- `barWidth`: return 0 for null; otherwise `Math.round((0.05 + 0.95 * normalize(value, range, {}))
  * 100)`. It takes no `def` because bars never invert. Pass an empty def object rather than adding an
  unreachable branch.
- Coverage pitfall: every `?.`, `??` and default parameter counts as a branch under v8. Keep these to a
  minimum and make sure tests reach both sides (for example `options` omitted, `{}`, and
  `{ invertLowerIsBetter: false }`).

**Data and API changes.** None. No changes to `domain/`, providers, `package.json`, `vite.config.ts`
or tsconfig.

**Dependencies.** None new. `@vitest/coverage-v8` is already installed.

## 4. Design

These are pure functions with no UI, so loading, empty, error and success states, responsive layout and
accessibility do not apply directly. What does carry over to later UI tickets:
- "Empty" and "error" data are values, not exceptions. A null or missing stat renders `'—'`. "No range"
  gives a neutral 0.5 position and no `NaN` widths. No function throws for any typed input.
- Accessibility: later components should give the em dash an accessible label such as "not
  applicable". This ticket only fixes the glyph (A8). Best-of returns indices, so components can show
  "best" with more than colour alone (the design uses black or bold).
- Mobile and desktop: the output does not depend on width.

## 5. Risk and security

- **Input validation.** The inputs are typed and internal (provider data). `NaN` and `-0` are not
  handled specially (A6). There is no user input, auth or network access, and nothing to expose.
- **Failure mode: floating point at `min === max` bar width.** `0.05 + 0.95 * 0.5` might land on
  0.52499... and round to 52. Safeguard (T4): the test asserts the literal `53` from AC17 and also
  checks equality with the inline design expression. If the literal fails, the builder must not change
  the formula. Report it as a requirements conflict, because the design expression wins (AC19).
- **Failure mode: `toFixed` and `toLocaleString` rounding quirks** (for example `1.005.toFixed(2)`).
  Safeguard: tests compare against `value.toFixed(d)` and `value.toLocaleString('en-US')` computed in
  the test, plus the literal examples from AC2 and AC3. No custom rounding.
- **Failure mode: ICU or locale differences** in Node for `toLocaleString('en-US')`. Node ships full
  ICU, so this is low risk. The literal cases `'4,806'` and `'-1,200'` would catch a regression.
- **Purity regression.** Safeguard (T5): tests pass frozen inputs (`Object.freeze` on arrays, entity
  objects and stats maps) and assert deep equality with a copy afterwards. A grep-style test or review
  step confirms `stats.ts` has no league keys and no React import.
- **Coverage gate false pass.** Safeguard (T6): run the exact AC21 command. Confirm it exits non-zero
  when a branch is uncovered by temporarily skipping one case locally (do not commit that change).

## 6. Gaps check

- Auth: not applicable (pure client functions, no data access).
- Validation: typed inputs. Null and undefined are handled everywhere (A3). Empty arrays are handled
  (AC10, AC12).
- Error handling: nothing throws. Degenerate cases return defined values (AC14, AC18).
- Mobile: not applicable. Accessibility: notes passed to later tickets (section 4).
- Config and env vars: none. Locale is hard-coded to `en-US`.
- Tests: table-driven `it.each` per function, a design-parity block (AC19) and a purity block (AC20),
  with the coverage gate as the final check.

## 7. Tasks

Each task is one commit. Tests and implementation go together, test first. Write and run the stated
tests, then implement until green. Run `npm run lint`, `npm run typecheck` and `npm run format` in
`web/` before every commit.

- **T1 Skeleton and types.** Create `web/src/lib/stats.ts` with `StatRange`, `NULL_PLACEHOLDER` and
  typed exported signatures (stub bodies may throw `'not implemented'`). Create `stats.test.ts` with
  shared fixtures: a small `defs` helper and T04 defs from `teamStatDefs()` and `playerStatDefs()`
  looked up by key in the test file only. (AC20)
- **T2 `formatStat`.** Table cases: null and undefined for several defs. Decimals 1 (`64.25`, `7`,
  `1234.5`). No decimals (`4806`, `-1200`, `12.3456`). `decimals: 0` (`12.3456` gives `'12.346'`, A1).
  Signed (`3`, `-1`, `0`, and `2.5` with decimals 1). Unsigned positive. T04 `to` and `pdiff`. (AC1 to
  AC5, AC19)
- **T3 `bestIndex`.** Table cases: higher-best, lower-best (T04 `int` and `papg`), ties (all returned,
  ascending), nulls and undefined mixed in, null at the best position, empty, all-null, a single
  non-null value among nulls, exactly 2 equal values (both best), negative values. (AC6 to AC10, AC19)
- **T4 `leagueRange`, `normalize` and `barWidth`.** Range: mixed nulls and missing keys, a single
  value (`min === max`), empty list, and all-null list (both give `null`). Normalize: min, max and
  midpoint; `min === max`; null; "no range"; inversion requested with lowerIsBetter true and false;
  inversion not requested; `options` omitted versus `{}`. Bar width: 5, 100, 53, 0 for null, "no range"
  gives 53, and a lowerIsBetter def does not invert bars. (AC11 to AC18)
- **T5 Design parity and purity.** Add a block that reimplements the design expressions inline in the
  test (`fmt`, best condition, `range`, `n01`, bar `p`, radar `t`) and checks them against the library
  over a small mock pool built from T04 entities via `MockProvider` or the builders, for every T04 stat
  key. Add frozen-input tests that show no mutation. (AC19, AC20)
- **T6 Coverage gate.** Run the AC21 command and fill any gaps with table cases, never with ignore
  comments. Confirm it fails below 100% (local check only). Then run the full AC22 suite. Do not add a
  script or config (keeps the change to two files; A7 makes it optional). (AC21, AC22)

**Parallelism.** After T1 lands, the test-writer can write the T2, T3 and T4 tables in parallel with
the implementation. The examples in section 2 and the API in section 3 are a complete spec. The T5
parity block depends only on the design script and the T1 signatures, so it can also be written early.
Only T6 must come last.

## 8. Open questions

None block this ticket. Non-blocking, carried from the requirements:
1. Should decimal-formatted values get thousands separators (`'1,234.5'`)? The design says no, and it is
   not visible with today's data.
2. Should `decimals: 0` round to an integer instead of following the design's truthiness check? No
   current def uses it.
3. Should `normalize` clamp to [0, 1] once real API data arrives (values outside the pool)?
4. (New) If the `min === max` bar width computes to 52 in floating point rather than 53, which wins: the
   AC17 literal or the design expression? This plan says the design expression wins (AC19).
