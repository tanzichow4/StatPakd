# T05 requirements: Stat utilities (format, best, normalize)

Source ticket: `docs/tickets/T05-stat-utilities.md` (its acceptance criteria are the contract).
Related: `docs/plan.md` (pure logic lives outside components and is unit tested first), T03 types in
`web/src/domain/types.ts` (`StatDef`, `StatValue`, `StatMap`, `Entity`), design script in
`design_handoff_statpakd/design/StatPakd App.dc.html` `renderVals()` (~lines 358-382, 391):
`range`, `fmt`, `n01`, `rows` (best-of), `bars` (bar width), `radar.polys` (lower-is-better inversion).
Design README line 56: normalization uses the full league pool range for the current season, ignoring
nulls.

## Goal

Provide pure, league-agnostic functions in `web/src/lib/stats.ts` that format stat values, pick the
best value(s) among selected entities, compute a pool's min/max range, and normalize values (plus the
bar-width helper) exactly as the design script does. Every chart and table ticket will consume these,
so their behaviour must be fully pinned by table-driven tests with 100% branch coverage.

## Design-script semantics (confirmed by reading the script)

Mapping: design `dec` = `StatDef.decimals`, `sign` = `signed`, `low` = `lowerIsBetter`, `e.s` = `stats`.

- `fmt(k, v)`: `v == null` gives `'—'` (U+2014). If `dec` is truthy, text is `v.toFixed(dec)` (no
  thousands separators). Otherwise text is `v.toLocaleString('en-US')` (thousands separators; default
  `Intl` rounding to at most 3 fraction digits). If `sign` and `v > 0`, prefix `'+'`. Negative values
  keep their native `-` (hyphen-minus); zero gets no sign.
- Best-of (table rows): `vals` = selected values with `null`/missing removed. `best` = `min(vals)` if
  `low` else `max(vals)`. A cell is best iff `vals.length > 1 && v != null && v === best`. So: nulls
  ignored; exact ties are all best; fewer than 2 non-null values means nobody is best.
- `range(k)`: `[min, max]` over the whole pool (not just selected), `null`/missing filtered out.
- `n01(k, v)`: `v == null` gives `0`; `max === min` gives `0.5`; else `(v - min) / (max - min)`. No
  clamping, no inversion.
- Bar width: `v == null` gives `0%` (not 5%); else `Math.round((0.05 + 0.95 * n01) * 100)` percent.
  Bars are NOT inverted for lower-is-better.
- Radar: `t = n01`; if `low && v != null`, `t = 1 - t` (null stays 0, not inverted to 1). The radar
  then applies its own `0.08 + 0.92 * t` geometry, which is not part of this ticket.

## Acceptance criteria

Formatting (`formatStat(value, def)`)
- AC1: `null` (and `undefined`, i.e. a missing stat key) returns `'—'` for any def.
- AC2: When `def.decimals` is a positive number, output is the same string as
  `value.toFixed(decimals)`, e.g. `64.25` with decimals 1 gives `'64.3'`, `7` with decimals 1 gives
  `'7.0'`, and `1234.5` with decimals 1 gives `'1234.5'` (no thousands separator, matching the design).
- AC3: When `def.decimals` is absent or `0`, output equals `value.toLocaleString('en-US')`, e.g.
  `4806` gives `'4,806'`, `-1200` gives `'-1,200'`, `12.3456` gives `'12.346'`.
- AC4: When `def.signed` is true, positive values get a leading `'+'` (`3` gives `'+3'`, `2.5` with
  decimals 1 gives `'+2.5'`), negative values show `'-'` (`-1` gives `'-1'`), and `0` gives `'0'`.
- AC5: When `def.signed` is false/absent, positive values have no `'+'`.

Best-of (`bestIndex(values, def)`)
- AC6: Given an array of values for the selected entities, it identifies every index whose value is
  best; the result is an ordered collection of indices (ascending), empty when none is best.
- AC7: Higher is best by default; with `lowerIsBetter` the smallest value is best.
- AC8: `null`/`undefined` entries are never best and are excluded when choosing the best value.
- AC9: All indices that exactly equal (`===`) the best value are returned (ties all best).
- AC10: If fewer than 2 non-null values exist (including empty input and all-null input), no index is
  returned.

Range (`leagueRange(entities, key)`)
- AC11: Returns the min and max of `entity.stats[key]` across all given entities, ignoring `null` and
  missing keys.
- AC12: When no entity has a non-null value for `key` (or the list is empty), it returns a defined
  "no range" result (see Assumption A4) and never throws.

Normalize (`normalize(value, range, def, ...)`) and bar width
- AC13: For a value inside the range, returns `(value - min) / (max - min)`: min gives `0`, max gives
  `1`, midpoint gives `0.5`.
- AC14: When `min === max` (division by zero), returns `0.5` and never `NaN`/`Infinity`.
- AC15: `null`/missing value returns `0`.
- AC16: Callers can request lower-is-better inversion (radar use): when requested and
  `def.lowerIsBetter` is true and value is non-null, the result is `1 - n` (min gives `1`, max gives
  `0`, `min === max` gives `0.5`); null still returns `0`. When not requested (bar use), or when
  `lowerIsBetter` is false, no inversion happens.
- AC17: Bar-width helper returns an integer percentage `Math.round((0.05 + 0.95 * n) * 100)` from the
  non-inverted normalized value: pool min gives `5`, pool max gives `100`, `min === max` gives `53`.
  A `null`/missing value gives `0`.
- AC18: With a "no range" result (AC12), normalize returns `0.5` for a non-null value and `0` for null;
  bar width follows from that. No `NaN`/`Infinity` is ever returned.

Cross-cutting
- AC19: For the same inputs, every function produces the same output as the corresponding design-script
  expression (`fmt`, best-of condition, `range`, `n01`, bar `p`, radar `t`). Tests include table cases
  using the T04 stat defs (e.g. `int` and `papg` lower-is-better, `to` signed, `pdiff` signed with
  decimals 1).
- AC20: The functions are pure (no mutation of inputs, no React, no league-specific keys inside
  `stats.ts`) and are exported from `web/src/lib/stats.ts`.
- AC21: Unit tests are table-driven and cover nulls, ties, signed, lower-is-better, `<2` non-null, and
  `min === max`; `web/src/lib/stats.ts` reaches 100% branch (and statement/function/line) coverage.
  Coverage command, run from `web/`:
  `npx vitest run src/lib/stats.test.ts --coverage --coverage.include=src/lib/stats.ts --coverage.thresholds.100`
  (`@vitest/coverage-v8` is already in devDependencies and installed; `vite.config.ts` has no
  coverage config today. The command must exit non-zero below 100%.)
- AC22: `npm test`, `npm run lint`, `npm run typecheck`, and `npm run format:check` pass in `web/`.

## Out of scope

- Using the functions in any component (table, bars, radar, 3D): later tickets.
- Radar geometry (`0.08 + 0.92 * t`, points, rings), 3D mapping (`2 * n01 - 1`), projection math.
- Team breakdown roster formatting and best rule (`tf` uses `String(v)`, `snap` gets `'%'`, roster best
  is `v > 0 && v === max` with no `>1` rule): belongs to the team breakdown ticket.
- Share bar percentages / leader text.
- Locale switching; output is always `en-US`.
- A permanent coverage config or npm script is optional, not required (see A7).
- Any Python changes.

## Assumptions

- A1: The design script wins where the ticket wording is looser. In particular, thousands separators
  only appear when `decimals` is absent/0 (design uses `toFixed` otherwise), and `decimals: 0` behaves
  like "no decimals" (`toLocaleString`, up to 3 fraction digits), because the design tests `d.dec`
  for truthiness.
- A2: `bestIndex` returns all best indices (ties), not a single index, despite the singular name; the
  name stays as in the ticket. Equality is exact `===` (no epsilon), as in the design.
- A3: A missing key (`undefined`) is treated the same as `null` everywhere, matching the design's
  `!= null` checks.
- A4: `leagueRange` with no non-null values returns a "no range" result (e.g. `null`) rather than the
  design's `[Infinity, -Infinity]`; the design never feeds a non-null value into that case, so outputs
  for design-reachable inputs are unchanged. Exact shape is the planner's choice.
- A5: `normalize` does not clamp, matching the design; values come from the same pool the range is
  computed over, so results are within [0, 1]. Tests only assert in-range behaviour plus the
  degenerate cases.
- A6: Inversion for lower-is-better is opt-in at the call site (radar) and off by default (bars), since
  the design inverts only the radar. Negative zero and `NaN` inputs are not handled specially.
- A7: Running coverage via CLI flags is sufficient for the AC; the planner may additionally add a
  `test:coverage` script or a `coverage` block in `vite.config.ts` (does not change behaviour).
- A8: The em dash `'—'` (U+2014) is the null placeholder, as in the design.

## Open questions

None blocking; defaults chosen above. Non-blocking, for the human later:
1. Should decimal-formatted values also get thousands separators (e.g. `'1,234.5'`)? Design says no;
   current per-game stats never reach 1,000, so it is invisible today.
2. Should `decimals: 0` round to an integer (`'1,235'`) rather than follow the design's truthiness
   check? No current stat def uses `decimals: 0`.
3. Should `normalize` clamp out-of-pool values to [0, 1] defensively once real API data arrives?
