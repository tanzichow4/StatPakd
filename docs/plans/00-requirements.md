# T03 requirements: Domain types and provider interface

Source ticket: `docs/tickets/T03-domain-types-and-provider-interface.md` (its acceptance criteria are the contract).
Related: `docs/plan.md`, T04 (mock provider, first implementer), T22 (Python API must serve this contract),
design script in `design_handoff_statpakd/design/StatPakd App.dc.html` (data shapes: `LEAGUES`, `SEASONS`,
`STATS`, `buildPlayers`, `buildTeams`, `buildRoster`).

## Goal
Define league-agnostic TypeScript domain types (`League`, `StatDef`, `Entity`, `RosterEntry`, `EntityKind`)
and the async `DataProvider` contract in `web/src/domain/`. Both the T04 mock provider and the later API
provider (T22/T23) will implement this contract, so the UI never depends on where data comes from.

## Acceptance criteria

Ticket criteria (verbatim intent):

- **AC1** `web/src/domain/types.ts` and `web/src/domain/provider.ts` exist, and `npm run typecheck` passes
  under the existing strict tsconfig (`strict: true`, `erasableSyntaxOnly: true`, `verbatimModuleSyntax: true`).
- **AC2** No `any` appears in `web/src/domain/` (neither explicit `any` nor `as any`); searching the folder for
  the word `any` as a type finds nothing.
- **AC3** No NFL-specific names appear anywhere in `web/src/domain/` (identifiers, string literals or comments).
  A case-insensitive search of the folder for at least these terms returns no matches: `NFL`, `quarterback`,
  `touchdown`, `passYds`, `rushYds`, `recYds`, `QB`, `RB`, `WR` (as whole words), `TE` (as a whole word),
  `Chiefs`, `Eagles`, `AFC`, `NFC`, `snap`, `sack`.
- **AC4** `provider.ts` carries a short documentation comment (TSDoc block) that describes the contract as
  "what T22 must serve": each method, its arguments, its return shape, and that all methods are async.

Scope details from the ticket, made testable:

- **AC5** `EntityKind` is exported and accepts exactly `'players'` and `'teams'`; assigning any other string
  is a type error.
- **AC6** `StatDef` is exported with required `key`, `label`, `group` (all strings) and optional
  `decimals` (number), `lowerIsBetter` (boolean), `signed` (boolean), `extra` (boolean). An object with only
  the three required fields type-checks; omitting any required field is a type error.
- **AC7** `Entity` is exported with required `id`, `name`, `shortName`, `meta`, `badge` (strings),
  optional `position` and `teamId` (strings), and `stats: Record<string, number | null>`. A stat value of
  `null` type-checks; a string or `undefined` stat value is a type error.
- **AC8** `League` and `RosterEntry` are exported types (fields per Assumptions A2 and A4).
- **AC9** `DataProvider` is exported with exactly these five methods, each returning a `Promise` of a typed
  result:
  - `getLeagues(): Promise<League[]>`
  - `getSeasons(leagueId): Promise<season list>`
  - `getStatDefs(leagueId, kind: EntityKind): Promise<StatDef[]>`
  - `getEntities(leagueId, kind: EntityKind, season): Promise<Entity[]>`
  - `getRoster(leagueId, teamId, unit, season): Promise<RosterEntry[]>`
  A synchronous implementation (returning plain values) is a type error.
- **AC10** The docs state, on the `stats` field (of both `Entity` and `RosterEntry`) and in the contract
  comment, that a `null` stat means "not applicable" (distinct from zero), and that a missing key means the
  stat is not provided.
- **AC11** A Vitest test file under `web/src/domain/` exercises the types at compile level: it builds a
  minimal in-test object satisfying `DataProvider` with neutral, made-up data (no league-specific names) and
  asserts each method resolves to the expected shape. It also includes `@ts-expect-error` checks for at least
  AC5 (invalid kind), AC7 (non-number stat) and AC9 (sync return). `npm test`, `npm run lint`,
  `npm run typecheck` and `npm run format:check` all pass.
- **AC12** No existing test is removed or weakened; no files outside `web/src/domain/` change, other than
  optionally `docs/progress.md`.

## Out of scope
- Any `DataProvider` implementation (mock provider is T04; API provider is T23).
- Porting design data, NFL stat definitions, rosters or the seasonal `vary` logic (T04).
- Formatting, best-of, normalization utilities (T05); app state/reducer/context (T06).
- A React context or hook that supplies the provider to components.
- Python/pydantic mirror models and HTTP endpoint shapes (T22).
- Loading/error state types or caching/retry behaviour (T23).
- Roster column definitions / share-of-production definitions (T15 to T17 decide where these come from).
- Changing tsconfig, lint config or package dependencies.

## Assumptions
Chosen defaults because the run is non-interactive. Each follows the design script and the
league-agnostic principle in CLAUDE.md and `docs/plan.md`.

- **A1 Identifiers are strings.** `leagueId`, `teamId`, entity `id` and `season` are typed as `string`
  (the design uses `'NFL'`, `'phi'`, `'2024'`). Type aliases (e.g. `LeagueId`, `Season`) are allowed but
  must resolve to `string`.
- **A2 `League` shape.** Fields: `id: string`, `name: string` (display label), `enabled: boolean`
  (design `LEAGUES` uses `{ k, on }`; disabled leagues are shown as "Soon"). No other fields required.
- **A3 Seasons.** `getSeasons` returns `Promise<string[]>`, ordered newest first (design: `['2024','2023','2022']`).
  Ordering is documented in the contract comment, not enforced by types.
- **A4 `RosterEntry` shape.** The ticket names it without fields. Based on `buildRoster`: `id: string`,
  `name: string`, `position: string`, optional `number?: number` (jersey/shirt number), and
  `stats: Record<string, number | null>` with the same null semantics as `Entity`. The design's `i` (colour
  index) is a UI concern and is not part of the type.
- **A5 Roster `unit` is an opaque string.** The design uses `'off' | 'def'`, but a fixed union would bake in
  one league's structure. `unit` is typed as `string` (alias allowed, e.g. `RosterUnit = string`); the valid
  values come from data. The contract comment notes this. No method to list units is added (ticket defines
  exactly five methods).
- **A6 `badge`.** `badge: string` is the short text shown in the entity tile (design `tile`, e.g. a position
  or team abbreviation). The design's `big` text is not a separate field; components derive or omit it.
- **A7 `meta`.** `meta: string` is a preformatted subtitle line produced by the provider (design builds it,
  e.g. "TEAM · POS · #N"). The UI does not parse it.
- **A8 "README comment" means a TSDoc block** at the top of `provider.ts` (plus per-method TSDoc). A separate
  `web/src/domain/README.md` is optional; if added, it must also pass AC3.
- **A9 AC3 term list.** The forbidden-term list in AC3 is the minimum; the check applies to comments too, so
  examples in docs must use neutral placeholders (e.g. "league A", "team-1", "points").
- **A10 Tests for a types-only ticket.** CLAUDE.md requires tests with behaviour changes; since types have no
  runtime behaviour, AC11 uses a compile-level test with an in-test stub provider. This stub is not a
  shipped implementation and lives only in the test file.
- **A11 Readonly.** Using `readonly` arrays/properties is permitted but not required; T04 must be able to
  return its data without casts either way.
- **A12 No enums.** `erasableSyntaxOnly` is on, so unions and type aliases are used rather than TS `enum`.
- **A13 Errors.** Failures surface as rejected promises; no error type is part of this contract (T23 handles
  error UI).

## Open questions
Ordered by how much they block. All have defaults recorded above, so none block this ticket.

1. Should roster `unit` be a fixed `'off' | 'def'` union (matches the design and T15's Offense/Defense tabs)
   or an opaque string as assumed in A5? If opaque, where do unit labels come from (a future provider method
   or league metadata)? Affects T15.
2. Should roster column and share definitions (design `OFF_COLS`, `DEF_COLS`, `OFF_SHARE`, `DEF_SHARE`) be
   served through `DataProvider` (e.g. a roster stat-defs method), given the "data comes through the
   DataProvider" rule? Not needed for T03; matters for T16/T17 and T22.
3. Is `RosterEntry` (A4) the right shape, in particular `id` (absent in the design) and optional `number`?
4. Should `League` carry more than `id`, `name`, `enabled` (e.g. a separate "coming soon" flag or sort order)?
