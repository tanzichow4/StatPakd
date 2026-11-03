# T04 requirements: Mock NFL data and provider

Source ticket: `docs/tickets/T04-mock-nfl-data.md` (its acceptance criteria are the contract).
Related: `docs/plan.md` (mock data is deterministic fake data for 2023/2022 and must be labelled as sample
data), T03 types in `web/src/domain/types.ts` and `web/src/domain/provider.ts`, design script in
`design_handoff_statpakd/design/StatPakd App.dc.html` (lines ~196-326: `ROSTERS`, `OFF_T`, `DEF_T`,
`SEASONS`, `LEAGUES`, `RAW_P`, `RAW_T`, `STATS`, `RATE`, `rnd`, `vary`, `buildPlayers`, `buildTeams`,
`buildRoster`).

## Goal
Port the design's sample NFL data and its builder logic (including the deterministic hash-based variation
for 2023 and 2022) into `web/src/data/nfl/`, producing the T03 `Entity`, `RosterEntry`, `StatDef` and
`League` shapes. Expose it through a `MockProvider` in `web/src/data/mockProvider.ts` that implements the
T03 `DataProvider` contract, so later UI tickets can run entirely on sample data.

## Acceptance criteria

Ticket criteria (made testable):

- **AC1 2024 values match the design.** For season `'2024'`, a test asserts the provider/builder output for
  at least 5 players and at least 3 teams equals the values the design script produces, including derived
  stats. The sample must include at least one player from each position QB, RB, WR, TE. Reference values
  (computed from the design script):
  - Saquon Barkley (`barkley`): rushYds 2005, rushTd 13, ypc 5.8, rec 33, recYds 278, recTd 2, ypr 8.4,
    scrim 2283, totTd 15, passYds `null`.
  - Josh Allen (`allen`): passYds 3731, passTd 28, int 6, cmp 63.6, rate 101.4, rushYds 531, ypc 5.2,
    rec `null`, recYds `null`, recTd `null`, ypr `null`, scrim 531, totTd 12.
  - Kansas City Chiefs (`kc`): ppg 22.6, ypg 335.6, pass 225.0, rush 110.6, papg 19.2, to -1, third 47.4,
    win 88.2, wins 15, meta `AFC West · 15–2` (middle dot U+00B7, en dash U+2013, as in the design).
- **AC2 Deterministic.** Calling each builder (players, teams, roster) twice with the same arguments yields
  deeply equal output, for every season in `['2024', '2023', '2022']`, and for every team and both roster
  units. Calling the provider methods twice likewise resolves to deeply equal results. No use of
  `Math.random`, `Date` or other non-deterministic input.
- **AC3 Nulls.** For every season:
  - every QB has `rec`, `recYds`, `recTd`, `ypr`, `tgt` and `recYpg` equal to `null`;
  - every player with fewer than 30 carries has `ypc === null`, and every player with 30 or more has a
    number;
  - every player with fewer than 10 receptions (or `null` receptions) has `ypr === null`, and every player
    with 10 or more has a number;
  - every non-QB has `passYds`, `passTd`, `int`, `cmp`, `rate`, `passYpg`, `tdInt` equal to `null`.
  A `null` stat is never replaced by `0`.
- **AC4 Sample-data label.** Exactly one exported string constant (outside `web/src/domain/`) holds the
  sample-data label the UI can show; its value is non-empty and says the data is sample data (default text
  per A9). A test imports and asserts it.

Scope details from the ticket, made testable:

- **AC5 Data ported.** `RAW_P` (17 players), `RAW_T` (8 teams), `ROSTERS` (8 teams, `off` with 7 entries and
  `def` with 5 entries each), `OFF_T`, `DEF_T` and `STATS` (22 player stat defs, 13 team stat defs) are
  ported with the same values as the design, in files under `web/src/data/nfl/`.
- **AC6 2023 and 2022 match the design's variation.** For seasons `'2023'` and `'2022'`, a test asserts a
  sample of at least 3 player stats, 3 team stats (including `to` and `win`) and 2 roster stats equal the
  values the design script's `rnd`/`vary`/`J` logic produces for the same inputs, and that at least one of
  these differs from its 2024 value. Team `win` never exceeds 100 and roster `snap` never exceeds 100.
- **AC7 Output shapes.** Builder and provider output type-checks as T03 types without casts to `any` or
  `unknown`:
  - Players map to `Entity` with `id`, `name`, `shortName` (design `short`), `badge` (position),
    `position`, `teamId` (A3), `meta` (`TEAM · POS · #N`, e.g. `BUF · QB · #17`) and `stats` containing all
    22 player stat keys from `STATS.players`.
  - Teams map to `Entity` with `id`, `name`, `shortName` and `badge` (abbreviation), `meta`
    (`<division> · W–L`), no `position`, and `stats` containing all 13 team stat keys.
  - Roster rows map to `RosterEntry` with `id` (A4), `name`, `position` (role with its digit removed, e.g.
    `RB1` gives `RB`), `number` (shirt number) and `stats`: offense keys `snap`, `touch`, `tgt`, `scrim`,
    `td`, `ypt`; defense keys `snap`, `tkl`, `sk`, `int`, `pd`, `ff`, `take`.
  - Stat defs map to `StatDef` (`k` to `key`, `g` to `group`, `dec` to `decimals`, `low` to
    `lowerIsBetter`, `sign` to `signed`, `extra` to `extra`), in the design's `STATS` array order.
- **AC8 League registry.** `getLeagues()` resolves to four leagues in the order NFL, NBA, MLB, NHL; only NFL
  has `enabled: true`. NBA, MLB, NHL have `enabled: false` (the UI renders these as "Soon").
- **AC9 Provider.** `MockProvider` in `web/src/data/mockProvider.ts` implements `DataProvider` (checked by
  the type system, e.g. `const p: DataProvider = new MockProvider()` or equivalent) and:
  - `getSeasons(nfl)` resolves to `['2024', '2023', '2022']`;
  - `getStatDefs(nfl, 'players' | 'teams')` resolves to the 22 / 13 defs from AC7;
  - `getEntities(nfl, kind, season)` resolves to the 17 players / 8 teams for that season;
  - `getRoster(nfl, teamId, unit, season)` resolves to the roster rows for that team and unit (`'off'`,
    `'def'`);
  - behaviour for disabled leagues and unknown ids follows A6.
- **AC10 Fresh data per call.** Mutating an object returned by the provider or a builder does not change the
  result of a later call.
- **AC11 Tests.** Vitest tests under `web/src/data/` cover AC1 to AC10, including snapshot tests of a few
  entities (at least one player, one team and one roster row) with the snapshot files committed.
- **AC12 Quality gates and boundaries.** `npm test`, `npm run lint`, `npm run typecheck` and
  `npm run format:check` pass. `web/src/domain/` is unchanged (no league-specific names added there). No
  existing test is removed or weakened. Files changed are limited to `web/src/data/**` and optionally
  `docs/progress.md`.

## Out of scope
- Formatting, best-of, range and normalization utilities (T05); app state, reducer, context or a hook that
  supplies the provider to components (T06).
- Any UI, including rendering the sample-data label, the league "Soon" tags, or wiring `MockProvider` into
  `App`.
- Roster column and share-of-production definitions (design `OFF_COLS`, `DEF_COLS`, `OFF_SHARE`,
  `DEF_SHARE`), `ORDER` grouping, `POS` filter list, `COLORS`/`MAX` and the design's per-row colour index
  `i` (later UI tickets).
- Real data, the Python API, the API provider or runtime validation (T21 to T23).
- Adding team entities for player teams not in `RAW_T` (CIN, WAS, ATL, DAL, LV), or rosters for them.
- Changing `web/src/domain/` types, tsconfig, lint config or package dependencies.
- Simulated network latency or loading states in the mock provider.

## Assumptions
Chosen defaults because the run is non-interactive. Each follows the ticket, the design script, CLAUDE.md
and `docs/plan.md`.

- **A1 Faithful port.** Numbers, rounding (`Math.round(x * 10) / 10`), thresholds (`>= 30` carries,
  `>= 10` receptions, `>= 20` touches for `ypt`), `/ 17` per-game divisors, `/ 0.7` target estimate and
  the FNV-1a `rnd` hash (including its seed strings such as `id + season + key`, `name + season + key`,
  `id + season + 'ya'`) are copied exactly, so outputs equal the design script's. Where the design's quirks
  affect output (e.g. QB `tgt` null, `vary` returning the input unchanged for 2024), they are preserved.
- **A2 Stat keys keep the design names** (`passYds`, `ppg`, `snap`, ...). League-specific names are fine in
  `web/src/data/` (the "no league names" rule applies to `web/src/domain/` and components).
- **A3 Player `teamId`** is the lowercased team abbreviation (e.g. `BUF` gives `buf`), which equals the team
  entity id when the team exists in `RAW_T`. For teams not in `RAW_T` it refers to a team with no entity;
  consumers must tolerate that.
- **A4 Roster `id`.** The design has none. Each row gets a deterministic id unique within the whole mock
  dataset (e.g. derived from team id, unit and row index, or a name slug). The exact format is not part of
  the contract.
- **A5 Ids and labels.** League ids are lowercase (`nfl`, `nba`, `mlb`, `nhl`) and league names are the
  design labels (`NFL`, `NBA`, `MLB`, `NHL`). Player and team ids are the design ids (`allen`, `kc`, ...).
  Roster units are the design keys `off` and `def`. The design's `big` text (`#17`) is not stored (T03 A6).
- **A6 Disabled and unknown inputs.** For a known but disabled league, `getSeasons`, `getStatDefs`,
  `getEntities` and `getRoster` resolve to `[]` (empty result, per the T03 contract). An unknown league id,
  unknown season, unknown team id or unknown roster unit rejects the promise with an `Error`.
- **A7 Optional `StatDef` fields** are omitted when the design does not set them (not set to `undefined`
  or `false`).
- **A8 Entity order** follows the design arrays (`RAW_P`, `RAW_T`, `ROSTERS[team][unit]`); no sorting.
- **A9 Sample-data label text** is the design's footer text: `Sample data for design purposes.` One exported
  constant (for example `SAMPLE_DATA_LABEL`) in `web/src/data/`; the UI ticket that shows it decides where.
- **A10 "Builders"** means exported, synchronous, pure functions in `web/src/data/nfl/` equivalent to
  `buildPlayers(season)`, `buildTeams(season)` and `buildRoster(teamId, unit, season)`, so tests can call
  them directly; `MockProvider` wraps them in promises.
- **A11 Reference values.** Expected 2023/2022 values in tests are derived by running the design's
  algorithm (e.g. computed once from the design script and pasted in as literals, or captured via snapshot
  after a manual check), not by calling the code under test.

## Open questions
Ordered by how much they block. All have defaults recorded above, so none block this ticket.

1. Should unknown ids/seasons reject or resolve empty (A6)? Affects error handling in T06/T23.
2. Should the sample-data label say more than the design footer, e.g. that 2023 and 2022 are generated
   (A9, `docs/plan.md` says "do not present it as real")?
3. Should player `teamId` point only at existing team entities (A3), and should teams such as CIN, WAS,
   ATL, DAL, LV get team entities?
4. Should roster column/share definitions be served through `DataProvider` (carried over from T03; matters
   for T16/T17 and T22)?
