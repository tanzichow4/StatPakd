# T04: Mock NFL data and provider
**Phase:** 1 · **Size:** M · **Depends on:** T03

## Goal
Port the design's sample data into a `MockProvider` implementing `DataProvider`.

## Scope
- Port `RAW_P`, `RAW_T`, `ROSTERS`, `OFF_T`, `DEF_T`, `STATS`, and the `buildPlayers`, `buildTeams`, `buildRoster` logic from the design script, including the deterministic `rnd`/`vary` seasonal variation for 2023 and 2022.
- Output the `Entity`/`RosterEntry`/`StatDef` shapes from T03. League registry lists NFL as enabled, NBA/MLB/NHL as "Soon".
- Data files live under `web/src/data/nfl/`; the provider under `web/src/data/mockProvider.ts`.

## Acceptance criteria
- [ ] 2024 values match the design for a sample of at least 5 players and 3 teams.
- [ ] Calling the builders twice gives identical output (deterministic).
- [ ] QBs have `null` receiving stats; ypc is `null` under 30 carries; ypr `null` under 10 receptions.
- [ ] Mock data is labelled as sample data in a single exported constant the UI can show.

## Tests
Snapshot a few entities; assert nulls and determinism.
