# T21: Spike: choose a stats data provider
**Phase:** 5 · **Size:** S · **Depends on:** none

## Goal
Pick where real NFL stats come from, before any integration work.

## Scope
Compare at least 3 options (paid API, free API, public dataset or scrape) on: coverage of the stats in the design (including snap %, targets, per-player team splits), seasons 2022 to 2024, licensing and terms for a public site, cost, rate limits, update frequency, and how well each maps to the T03 types. Write `docs/decisions/data-provider.md` with a recommendation and the main risks.

## Acceptance criteria
- [ ] Decision document with a comparison table and a recommendation.
- [ ] Terms of use checked for public display and redistribution.
- [ ] A mapping sketch from the recommended source to `Entity` and `StatDef`.

## Owner decision (2026-11-24)
Use nflverse through `nflreadpy`. See [the decision note](../decisions/data-provider.md), which lists
what is still open.
