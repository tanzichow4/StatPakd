# T05: Stat utilities (format, best, normalize)
**Phase:** 1 · **Size:** M · **Depends on:** T03

## Goal
Pure functions every chart and table uses.

## Scope (`web/src/lib/stats.ts`)
- `formatStat(value, def)`: decimals, thousands separators, signed (`+3`/`-1`), `null` gives "—".
- `bestIndex(values, def)`: index of best among selected; `lowerIsBetter` flips; nulls ignored; ties all best; none best if fewer than 2 non-null values (confirm against the design script).
- `leagueRange(entities, key)`: min/max over the whole pool ignoring nulls.
- `normalize(value, range, def)`: 0 to 1, inverted for `lowerIsBetter` when used for radar; bar width helper `5% + 95% * n`.

## Acceptance criteria
- [ ] Behaviour matches the design script for the same inputs.
- [ ] Division by zero (min equals max) handled.
- [ ] 100% branch coverage on these functions.

## Tests
Table-driven unit tests, including nulls, ties, signed, lower-is-better.
