# Plan: T16 Share of team production stacked bars

Source: `docs/tickets/T16-share-of-production.md`. The contract is `docs/plans/00-requirements.md`:
AC1 to AC32 and assumptions A1 to A14. This plan runs without stopping for approval. The
requirements list no blocking questions, so every default under Assumptions applies.

## 1. Goal and out of scope

Goal: in Team breakdown mode, below the team header card, show a "Share of team production" section
with a data-defined unit toggle, one 100% stacked bar per share stat (percent text, tooltips, leader
line) and a colour legend of the roster. Units, their labels and the share stats come from the
DataProvider, so components stay league-agnostic and T17 can reuse the same unit definitions.

Out of scope (from the requirements):
- Roster table, sorting, snap mini bars, leader pills (T17). T16 defines the full per-unit stat list
  in data (A1) but renders only the share rows.
- Responsive and a11y polish beyond AC22/AC23/AC29 (T18), e2e tests (T19), pixel fidelity including
  the toggle's exact radius and padding (T20).
- The design's "Sample data for design purposes." footer.
- League switching and the Python API serving the new provider method (T22/T23).
- Changes to compare mode, the Players view, the team chips or the header card.
- Animations or transitions of segments.

## 2. Acceptance criteria (copied from 00-requirements.md, same numbers)

`shares()` (pure function)
- AC1: A pure, exported `shares(values)` function takes an ordered list of stat values (`number`,
  `null` or `undefined`) and returns a list of integer percentages of the same length and order.
- AC2: `null`, `undefined`, zero and negative values count as 0 and always get 0%.
- AC3: When the sum of counted values is greater than 0, the percentages are non-negative integers
  that sum to exactly 100, computed by the largest-remainder method: each share starts at
  `floor(100 * v / total)`, and the leftover points go one each to the entries with the largest
  fractional remainders; equal remainders are broken by earlier position first. Examples that must be
  unit-tested: `[1, 1, 1]` -> `[34, 33, 33]`; `[2, 1]` -> `[67, 33]`; `[50, 50]` -> `[50, 50]`;
  `[5, 0, null, 5]` -> `[50, 0, 0, 50]`; `[7]` -> `[100]`.
- AC4: When the counted total is 0 (all zero/null/missing, or an empty list), every entry is 0 and the
  function returns no `NaN` or `Infinity`. `[]` -> `[]`.
- AC5: `shares()` does not mutate its input.

Data contract (league-agnostic unit and share definitions)
- AC6: The DataProvider exposes the roster units of a league (see Assumption A1): for each unit an
  opaque key, a display label and the stat definitions of that unit's roster stats, in display order.
  Share stats are marked on those stat definitions with a short share label; share rows render in
  definition order.
- AC7: For the mock NFL league the units are, in order, `off` labelled "Offense" and `def` labelled
  "Defense". Offense share stats, in order: `touch` "Touches", `tgt` "Targets", `scrim` "Scrimmage
  Yds", `td` "Touchdowns". Defense share stats, in order: `tkl` "Tackles", `sk` "Sacks", `take`
  "Takeaways", `pd` "Passes Defended". Each key matches a stat key produced by `buildRoster` for that
  unit (tested in the data layer).
- AC8: The MockProvider, the fixture provider and the domain contract tests are updated for the
  addition; for a disabled league it resolves to `[]` (same rule as the other methods).

Section placement and header
- AC9: In Teams + breakdown mode, below the team header card, a section is rendered containing an
  `h2` "Share of team production", a subtitle "How the workload splits across the roster" (13px,
  `#7A7A75`) and, to their right (wrapping below on narrow widths), the unit toggle. The section is
  not rendered in compare mode or Players mode, and is not rendered when the header card is not
  rendered (T15 AC14/AC19 cases: teams loading/failed or unknown `teamId`).
- AC10: The unit toggle is a segmented control with accessible name "Unit", one button per unit from
  the data, in data order, labelled with the unit label ("Offense", "Defense" for the mock data). The
  button whose key equals `state.unit` has `aria-pressed="true"`; the others `false`.

Toggle behaviour
- AC11: Clicking an inactive unit button dispatches `setUnit` with that unit's key; the rows switch
  to that unit's share stats and the bars, leaders and legend reflect that unit's roster for the same
  team and season. Clicking the active button changes nothing.
- AC12: The selected unit is the global `state.unit`: it persists across team chip changes, season
  changes and breakdown -> compare -> breakdown round trips (existing reducer behaviour).

Share rows
- AC13: One row per share stat of the selected unit, in definition order, laid out as a grid of
  `150px | minmax(0, 1fr) | 150px` with a 16px gap at desktop widths; rows are 12px apart.
- AC14: Left cell: the share label (14px/500) and below it the total text `` `${total} total` ``
  (11px, Geist Mono, `#9A9A95`), where `total` is the sum of counted values formatted with
  `formatStat` for that stat (en-US grouping, e.g. "1,234 total").
- AC15: Middle cell: a 30px tall bar, radius 5, 2px gap between segments, track background
  `#F3F3F0`, clipped (`overflow: hidden`). There is one segment per roster player whose value for the
  stat is greater than 0, in roster order; each segment's width is proportional to its value (design:
  `flex-grow = value`, `flex-basis: 0`, `min-width: 3px`), coloured with the player's legend colour.
- AC16: A segment shows its percentage as white 11px/600 text `"<pct>%"` when its `shares()`
  percentage is 9 or more, and no text when it is below 9.
- AC17: Right cell: `"Leader: <leader name> <pct>%"` (12px, `#555`, right aligned), where the
  leader is the roster player with the largest value (first in roster order on a tie), the leader
  name is the player's name without its first word (the full name if it has one word), and `pct` is
  that player's percentage from `shares()` (the same number shown in the segment and tooltip).
  Example with mock data: the default team's offense Touches row reads "Leader: Barkley NN%".
- AC18: All percentages shown in one row (segment text, tooltips, leader) come from a single
  `shares()` call over that row's roster values, so they are mutually consistent and the row's
  percentages sum to 100 when the total is greater than 0.

Zero total and missing data
- AC19: A stat whose counted total is 0 renders the empty track only (no segments, no percent text),
  the total text "0 total" and an empty right cell (no "Leader" text). No "NaN", "Infinity" or
  "undefined" appears anywhere in the section.
- AC20: An empty roster (`[]`) renders every share row as in AC19 and an empty legend; nothing
  throws.

Tooltips and accessibility
- AC21: Each segment has the tooltip text `` `${name} · ${value} (${pct}%)` `` (full player name,
  value formatted with `formatStat`, `·` is U+00B7), e.g. "Saquon Barkley · 378 (54%)". It is shown
  on mouse hover (a `title` attribute is acceptable for hover).
- AC22: Every segment is reachable with the Tab key (in roster order within a row, rows top to
  bottom), has the tooltip text as its accessible name, and while it has keyboard focus the tooltip
  text is visible on screen (not only in a `title` attribute) and a visible focus indicator is shown.
  Segments with percent text do not announce the bare percentage instead of the full tooltip text.
- AC23: Each bar has an accessible name that identifies its stat (e.g. "Touches share"), so a screen
  reader user knows which stat the segments belong to.

Legend
- AC24: Below the rows, a legend lists every roster player of the selected unit in roster order: a
  10x10 square (radius 2) in the player's colour and the full name (12px/500), wrapping with a 16px
  gap.
- AC25: Player colours are the series colours by roster index (`seriesColor(i)`: first player
  `#111111`, second `#E0472B`, ...), wrapping after 8, and are identical in the legend and the
  segments.

Loading, data changes and errors
- AC26: The section loads the roster with `getRoster(activeLeague, state.teamId, state.unit,
  state.season)`. Changing the team chip, the unit or the season reloads it; results of a superseded
  load are ignored (no flash of the previous team/unit/season after the new one has shown).
- AC27: While the unit definitions or the roster are loading, or if either load fails, the share rows
  and legend are not rendered and nothing throws; the heading, subtitle and toggle render once the
  unit definitions are available. No error text is required.
- AC28: If `state.unit` matches no unit from the data, no toggle button is pressed and no share rows
  or legend render; state is not changed automatically. Clicking a unit button then shows that unit.

Layout and league-agnosticism
- AC29: At a 375px viewport the section causes no page-level horizontal scroll: the label/total and
  the leader text remain fully visible (stacked above or below the bar), the bar spans the available
  width, and the toggle wraps below the heading if needed.
- AC30: No component, hook or model added or changed by T16 contains league-specific names or stat
  keys (`off`, `def`, `touch`, "Offense", player names, "NFL", etc.); the `noLeagueLiterals` test for
  `web/src/components/teams/` (and any new component folder) still passes.

Tests
- AC31: Unit tests for `shares()` cover AC1-AC5. Data-layer tests cover AC7-AC8. Component tests
  (Vitest + Testing Library, using invented fixture units, stats and roster) cover: the toggle
  (AC10-AC11), the leader text including a tie (AC17), the zero-total row (AC19), the empty roster
  (AC20), segment percent text threshold (AC16), tooltip text, keyboard focus and accessible names
  (AC21-AC23), legend order and colours (AC24-AC25), reload on team/unit/season change and stale load
  (AC26), loading/failure (AC27) and the unknown unit (AC28). Existing tests are not deleted or
  weakened.
- AC32: `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass in `web/`.

Added: none. The one near-gap (what T15's "nothing after the card" / "no roster call" tests become)
is a test-maintenance item, handled in T7 below, not a new behaviour.

## 3. Architecture

Approach: same pattern as T15, a pure model plus thin components, two small data hooks, and one
additive provider method. All new UI lives in `web/src/components/teams/` (already scanned for
league literals). No reducer change: the toggle uses the existing `state.unit` and `setUnit` (A5).

Domain (A1), `web/src/domain/`
- `types.ts`:
  - `StatDef.shareLabel?: string`, doc comment "Short label shown in the share-of-production rows.
    When set, the stat is a share stat. Share stats show in definition order."
  - `RosterUnitDef { key: RosterUnit; label: string; stats: StatDef[] }`, doc comment: roster stat
    definitions of the unit, in display order; T17 treats non-`extra` defs as table columns.
- `provider.ts`: required method `getRosterUnits(leagueId: LeagueId): Promise<RosterUnitDef[]>`
  with JSDoc (units in display order; `[]` for a disabled league). Required, so T22 must serve it.

Every `DataProvider` implementer and literal (found by search) must gain the method:
- `web/src/data/mockProvider.ts` (`MockProvider`, the only production implementer).
- `web/src/test/fixtureProvider.ts` `createFixtureProvider`: `getRosterUnits: vi.fn(() =>
  Promise.resolve([]))`. `entitiesProvider`, `seasonTeamsProvider` and
  `web/src/test/compareFixtures.ts` `compareProvider` all build on it, so they inherit it.
- `web/src/domain/domain.test.ts`: the `provider` literal (line 49) and the `syncProvider` literal
  (line 182) are object literals typed `DataProvider` and will fail typecheck until updated.
- Component tests that build providers only through these helpers need no change.

NFL data, `web/src/data/nfl/`
- New `rosterUnits.ts` exporting `rosterUnitDefs(): RosterUnitDef[]` (fresh copies, like
  `statDefs.ts`):
  - `off`, "Offense", group "Offense": `snap` "Snap %", `touch` "Touches" (share "Touches"), `tgt`
    "Targets" (share "Targets"), `scrim` "Scrim Yds" (share "Scrimmage Yds"), `td` "TD" (share
    "Touchdowns"), `ypt` "Yds / Touch" `decimals: 1`.
  - `def`, "Defense", group "Defense": `snap` "Snap %", `tkl` "Tackles" (share "Tackles"), `sk`
    "Sacks" (share "Sacks"), `take` "Takeaways" `extra: true` (share "Takeaways"), `int` "INT",
    `pd` "Pass Def" (share "Passes Defended"), `ff` "Forced Fum".
  - Labels from the design's `OFF_COLS`/`DEF_COLS`; share labels from `OFF_SHARE`/`DEF_SHARE`.
- `index.ts`: export `rosterUnitDefs`.
- `MockProvider.getRosterUnits(leagueId)`: `isEnabled` check (`[]` when disabled, rejects for an
  unknown league, same as the other methods), then `rosterUnitDefs()`.

Pure logic
- `web/src/lib/shares.ts`: `shares(values: ReadonlyArray<number | null | undefined>): number[]`.
  Counted value `c = v != null && Number.isFinite(v) && v > 0 ? v : 0`. If the total is 0, return
  zeros. Else floor `100 * c / total`, then hand the `100 - sum(floors)` leftover points to the
  indices sorted by remainder descending, index ascending (stable sort on a copy of indices). Only
  counted entries can receive points (a zero entry has remainder 0 and the leftover is always
  smaller than the number of positive entries, so this holds by construction; tested).
- `web/src/components/teams/shareModel.ts` (no React):
  - `PCT_TEXT_MIN = 9`.
  - `findUnit(units, key): RosterUnitDef | undefined`.
  - `shareStats(unit): StatDef[]`: defs with a non-empty `shareLabel`, in definition order.
  - `leaderName(name)`: trim, drop the first whitespace-separated word, full name if one word.
  - `buildShareRow(def, roster): ShareRowModel` with `{ key, label, barLabel, totalText, segments,
    leaderText }`:
    - one `shares()` call over `roster.map(r => r.stats[def.key])` (AC18);
    - `totalText = `${formatStat(total, def)} total``, total of counted values;
    - `segments`: entries with counted value > 0, in roster order, each `{ id, value, color:
      seriesColor(rosterIndex), pct, text: pct >= PCT_TEXT_MIN ? `${pct}%` : null, tooltip:
      `${name} · ${formatStat(value, def)} (${pct}%)` }`;
    - `leaderText`: `null` when total is 0, else `Leader: ${leaderName} ${pct}%` for the first max;
    - `barLabel = `${def.shareLabel} share``.
  - `legendItems(roster)`: `{ id, name, color: seriesColor(i) }[]`.
  - The 3px minimum width is CSS (`min-width: 3px`), not model.

Hooks, `web/src/components/teams/` (mirroring `useEntities`, including the stale-load guard keyed on
every input)
- `useRosterUnits(): RosterUnitDef[] | null`. `null` while loading or after failure.
- `useRoster(teamId, unit: RosterUnit | null, season): RosterEntry[] | null`. `null` while loading,
  after failure, or when `unit` is `null` (no provider call). Unlike `useEntities`, loading is
  `null`, not `[]`, because an empty roster must render zero rows (AC20) while loading renders none
  (AC27).

Components, `web/src/components/teams/`
- `UnitToggle.tsx`: `SegmentedControl` (light, label "Unit"), options from units in data order,
  `value = state.unit` (unknown unit -> nothing pressed, AC28), `onChange` dispatches `setUnit` only
  when the key differs.
- `ShareRow.tsx` + `.module.css`: props `row: ShareRowModel`.
  - Left: label + mono total. Middle: a `position: relative` wrapper holding the clipped track
    (`role="group"`, `aria-label={row.barLabel}`) and, outside the clipped track, the visible
    focus tooltip. Right: leader text or an empty cell.
  - Segment: `<span tabIndex={0} role="img" aria-label={tooltip} title={tooltip}
    style={{ flexGrow: value, background: color }}>` with the percent text as an `aria-hidden`
    child (role `img` makes children presentational, so the name is the full tooltip, AC22).
  - Focus tooltip: `focusedId` state set on `onFocus`, cleared on `onBlur`; when set, render a
    `<span role="tooltip">` with that segment's text above the bar. React state (not only
    `:focus` CSS) so it is testable in jsdom. Visible focus ring: `:focus-visible` outline with
    offset, inset so the track's `overflow: hidden` does not clip it (`outline-offset: -2px` plus
    a white inner ring).
- `ShareLegend.tsx`: `<ul aria-label="Legend">` of swatch + name.
- `ShareOfProduction.tsx` + `.module.css`: the container.
  - Props: `teamId`, `season`; reads `state.unit` and `dispatch` via `useAppState`.
  - Loads `useRosterUnits()`; `unit = findUnit(units, state.unit)`; `useRoster(teamId, unit ?
    unit.key : null, season)`.
  - Returns `null` until units load (AC27). Then renders `<section aria-labelledby>` with the header
    row (`h2`, subtitle `<p>`, `UnitToggle`), and only when `unit` and the roster are both
    non-null: the rows (from `shareStats(unit)` and `buildShareRow`, memoised) and the legend.
- `TeamBreakdown.tsx`: render `<ShareOfProduction teamId={teamId} season={season} />` directly after
  `TeamHeader`, inside the same `{team && ...}` branch (AC9, A6).

Dependencies, config and env: none new. No `.env` change. The only contract change is the additive
provider method and optional `StatDef` field, which T22 inherits.

## 4. Design

User flow: in Teams + breakdown the user sees chips, the header card, then "Share of team
production" with "How the workload splits across the roster" and the Offense | Defense toggle
(Offense pressed by default). Four rows show stacked bars with percent labels on the bigger
segments and "Leader: Barkley NN%" on the right, then the legend. Clicking Defense swaps rows,
bars and legend to the defense roster. Changing team chip or season reloads with the same unit.
Tabbing walks segment by segment; each focused segment shows a tooltip like "Saquon Barkley · 378
(54%)" above the bar.

States
- Teams loading/failed or unknown team: no header card, so no section (AC9).
- Unit defs loading or failed: no section yet (AC27). Units `[]` (disabled league): heading and an
  empty toggle, no rows.
- Unit defs loaded, roster loading or failed: heading, subtitle and toggle only (AC27).
- Unknown `state.unit`: heading and toggle with nothing pressed, no rows or legend, no roster call
  (AC28).
- Empty roster: every row shows an empty track, "0 total", empty right cell; empty legend (AC20).
- Zero-total stat in a non-empty roster: that row as in AC19, others normal.
- Success: rows and legend (AC13-AC25).
- Superseded loads: the stale-load guard returns `null` for the new key until it loads, so the old
  team/unit/season never shows after a switch (AC26).

Desktop (1280px): header row is a wrapping flex, title block left, toggle `margin-left: auto`.
Rows: `display: grid; grid-template-columns: 150px minmax(0, 1fr) 150px; gap: 16px;
align-items: center`, 12px between rows. Track: `display: flex; gap: 2px; height: 30px;
border-radius: 5px; overflow: hidden; background: #F3F3F0`. Segments `flex-basis: 0; min-width:
3px`, centred white 11px/600 text. Leader 12px `#555`, right aligned. Legend `flex-wrap: wrap;
gap: 16px` (row gap smaller), 10x10 radius-2 swatches. Colours use existing tokens where present.

Mobile (below 480px, the only existing breakpoint, used by `RadarChart.module.css`): rows switch to
one column with areas `label` / `bar` / `leader`, leader left aligned, 6px row gap; the toggle wraps
below the title; long names in the legend and leader wrap (`overflow-wrap: anywhere`, `min-width:
0`). Between 480px and desktop the grid stays three columns (bar is at least ~100px). Checked
manually in T9.

Accessibility
- Section labelled by its `h2`. Toggle is a fieldset named "Unit" with `aria-pressed` buttons.
- Each bar is a group named "<share label> share" (AC23). Segments are tab stops with role `img`,
  accessible name = tooltip text, percent text hidden from AT (AC22).
- Visible tooltip on focus (role `tooltip`, not linked by `aria-describedby` to avoid announcing
  the same text twice), visible `:focus-visible` ring.
- Legend is a named list. Zero-value players are not tab stops (no segment).
- Tab stop count (up to rows x players) is accepted per A8; revisit in T18.

## 5. Risk and security

- Input validation: values come from the provider and may be `null`, missing, zero, negative or
  non-finite; `shares()` counts all of those as 0, and `formatStat` is only called on counted
  totals and positive values, so no "NaN", "Infinity", "undefined" or "—" leaks (AC19). Safeguard:
  model tests with each bad value and a text scan of the rendered section for those strings (T4,
  T7).
- Auth and data exposure: none. Client-side rendering of provider data as React text nodes; names
  go into `aria-label`/`title` attributes, never HTML.
- Failure modes and safeguards:
  - Interface change breaks every provider literal at compile time. Safeguard: T1 updates all
    implementers found by search (section 3) and runs `npm run typecheck` in the same commit.
  - Stale roster after a fast team/unit/season switch. Safeguard: hook keyed on league, team,
    unit, season; deferred-promise test resolving the old load last (T5, T7).
  - Visible tooltip clipped by the track's `overflow: hidden`. Safeguard: tooltip rendered as a
    sibling of the track inside a relative wrapper (T6); checked manually (T9).
  - Rounding drift between segment, tooltip and leader. Safeguard: one `shares()` call per row in
    the model, with a test asserting the three agree (T4).
  - T15 tests that pin "nothing after the card" and "no `getRoster` call" (TeamBreakdown.test.tsx
    lines 103-112 and 195-201, App.teams.test.tsx lines 84-97) are superseded by AC9/AC26. They are
    rewritten to the new contract, not deleted: "the card is followed only by the share section"
    (`section.nextElementSibling` is the region "Share of team production", section count 2) and
    "`getRoster` is called once with the team, unit and season, and never for players" (T7).
  - Existing data tests that list provider methods ("all five methods return promises") gain the
    sixth method rather than being left stale (T2).
  - League literals: the teams scan gains the roster unit keys, labels and share labels (T8).

## 6. Gaps check

- Auth: not applicable (read-only, no user data).
- Validation: null, missing, zero, negative, non-finite, empty roster, unknown unit, zero total.
- Error handling: unit or roster load failure renders no rows, never throws, no error text (AC27).
- Mobile: 480px breakpoint stacking, toggle wrap, manual 375px check (AC29, T9).
- Accessibility: named section, toggle, bars, legend; focusable segments with visible tooltip and
  focus ring (AC22, AC23).
- Config and env vars: none; `.env` untouched.
- Tests: `shares()` unit tests, model tests, hook tests, presentational and container component
  tests, data tests, App integration with mock data, literal scan, full gate.

## 7. Tasks

Each task is one commit with its tests. Paths are under `web/src/`.

- T1: Domain contract and test doubles.
  - Add `StatDef.shareLabel?` and `RosterUnitDef` to `domain/types.ts`; add `getRosterUnits` to
    `domain/provider.ts` with JSDoc.
  - Add `getRosterUnits` to `createFixtureProvider` (default `[]`), and new helpers in
    `test/fixtureProvider.ts`: `fixtureRosterUnits()` (two invented units, e.g. `zunit` "Zunit
    One" and `zalt` "Zunit Two", each with share and non-share defs interleaved, one share def with
    an empty `shareLabel`), `fixtureRoster(unit)` (invented names, including a one-word name, a
    tie for the max, a stat that is zero/null for everyone, a negative value, a value under 9%, more
    than 8 players in one unit for colour wrap), and `rosterProvider(overrides?)` combining
    `seasonTeamsProvider` with units and a roster that depends on team, unit and season.
  - Update `domain/domain.test.ts`: both provider literals gain `getRosterUnits`; add a case that
    it resolves to `RosterUnitDef[]` and that `shareLabel` is optional and must be a string.
  - Temporarily make `MockProvider.getRosterUnits` compile (full implementation in T2) or do T2's
    MockProvider change here if preferred; typecheck must pass at the end of the commit.
  - Files: `domain/types.ts`, `domain/provider.ts`, `domain/domain.test.ts`,
    `test/fixtureProvider.ts`, `data/mockProvider.ts` (stub only if split).
  - ACs: AC6, AC8.
- T2: NFL roster unit defs and MockProvider.
  - Add `data/nfl/rosterUnits.ts` and export from `data/nfl/index.ts`; implement
    `MockProvider.getRosterUnits`.
  - Tests in `data/nfl/data.test.ts` and `data/mockProvider.test.ts`: exact units and labels in
    order; share stats per unit with keys and labels in order (AC7); every unit def key equals a key
    of `buildRoster` stats for that unit for every team and season, and vice versa; `take` is
    `extra`; fresh copies per call; disabled league resolves `[]`, unknown league rejects; the
    "every method returns a Promise" test includes the new method.
  - Files: `data/nfl/rosterUnits.ts`, `data/nfl/index.ts`, `data/mockProvider.ts`,
    `data/nfl/data.test.ts`, `data/mockProvider.test.ts`.
  - ACs: AC6, AC7, AC8.
- T3: `shares()`.
  - Add `lib/shares.ts` and `lib/shares.test.ts`: the five AC3 examples; `[]`; all zero, all null,
    `[undefined]`, negatives (`[-5, 5]` -> `[0, 100]`), non-finite as 0; length and order kept;
    integers, non-negative, sum 100 when total > 0 (table-driven plus a deterministic sweep over
    generated arrays); zero/negative entries never receive leftover points; tie-break by earlier
    index (`[1, 1, 1]`, `[1, 1, 1, 1, 1, 1]`); input frozen to prove no mutation.
  - Files: `lib/shares.ts`, `lib/shares.test.ts`.
  - ACs: AC1, AC2, AC3, AC4, AC5, AC31.
- T4: Share model.
  - Add `components/teams/shareModel.ts` and `shareModel.test.ts`: `findUnit` hit and miss;
    `shareStats` order and filtering (no label, empty label); `leaderName` one word, two words,
    three words, extra spaces; `buildShareRow` total text with grouping ("1,234 total"), segments
    only for positive values in roster order with roster-index colours (including after a skipped
    zero player and past 8), `text` at 8 vs 9, tooltip format with U+00B7 and grouped value, leader
    text and tie to first, `null` leader and "0 total" for zero total and empty roster, segment pct,
    tooltip pct and leader pct agree and sum to 100, no "NaN"/"Infinity"/"undefined" in any string;
    `legendItems` order and colours; inputs not mutated.
  - Files: `components/teams/shareModel.ts`, `components/teams/shareModel.test.ts`.
  - ACs: AC13 (order), AC14, AC15, AC16, AC17, AC18, AC19, AC20, AC21 (text), AC24, AC25.
- T5: Data hooks.
  - Add `components/teams/useRosterUnits.ts` and `useRoster.ts` with tests (pattern of
    `useEntities.test.tsx`): `null` while pending and after rejection; value after resolve;
    `useRoster` with `unit` `null` makes no call; changing team, unit or season returns `null`
    until the new load resolves and ignores an old load that resolves late; an empty roster returns
    `[]`, not `null`.
  - Files: `components/teams/useRosterUnits.ts`, `useRosterUnits.test.tsx`, `useRoster.ts`,
    `useRoster.test.tsx`.
  - ACs: AC26, AC27, AC28 (no call).
- T6: Presentational components.
  - Add `UnitToggle`, `ShareRow`, `ShareLegend` with CSS modules (section 4 values) and tests:
    - Toggle: named "Unit", buttons in data order with labels, pressed state, unknown value -> none
      pressed, clicking inactive calls `setUnit` via a state probe, clicking active dispatches
      nothing.
    - Row: label, total, group named "<label> share", segments as `img` with the tooltip name and
      `title`, percent text present only at >= 9 and not part of the accessible name, segment
      `style` flex-grow and colour, Tab order through segments with `userEvent.tab()`, focus shows a
      `tooltip` with the text and blur hides it, leader text, zero-total row has no `img`, no
      `tooltip`, no "Leader".
    - Legend: items in order with names and swatch colours.
  - Files: `components/teams/UnitToggle.tsx`, `UnitToggle.test.tsx`, `ShareRow.tsx`,
    `ShareRow.module.css`, `ShareRow.test.tsx`, `ShareLegend.tsx`, `ShareLegend.module.css`,
    `ShareLegend.test.tsx`.
  - ACs: AC10, AC11, AC13, AC14, AC15, AC16, AC17, AC19, AC21, AC22, AC23, AC24, AC25.
- T7: `ShareOfProduction` container and `TeamBreakdown` wiring.
  - Add `ShareOfProduction.tsx` + `.module.css`; render it after `TeamHeader` in `TeamBreakdown`;
    export from `components/teams/index.ts` if needed.
  - Tests in `ShareOfProduction.test.tsx` and `TeamBreakdown.test.tsx` with `rosterProvider` and a
    state probe:
    - Heading, subtitle and toggle; rows in definition order with leader text including a tie; the
      zero-total row; empty roster; legend (AC9-AC11, AC17, AC19, AC20, AC24).
    - Switching unit swaps rows, bars and legend; switching team chip and season reload with the
      same unit; old loads resolving late are ignored (AC11, AC12, AC26).
    - Units pending/rejected: no section; roster pending/rejected: header and toggle only, no
      throw (AC27).
    - Unknown `state.unit`: nothing pressed, no rows, `getRoster` not called, `unit` unchanged;
      clicking a unit shows it (AC28).
    - No section when the card is absent (unknown team, teams pending) (AC9).
    - Section text never contains "NaN", "Infinity" or "undefined" (AC19).
  - Rewrite the superseded T15 assertions to the new contract (section 5), keeping every other
    check in those tests.
  - Files: `components/teams/ShareOfProduction.tsx`, `ShareOfProduction.module.css`,
    `ShareOfProduction.test.tsx`, `TeamBreakdown.tsx`, `TeamBreakdown.test.tsx`,
    `components/teams/index.ts`.
  - ACs: AC9, AC11, AC12, AC17, AC19, AC20, AC26, AC27, AC28, AC31.
- T8: App integration and league-literal coverage.
  - `App.teams.test.tsx`: rewrite the T15 AC7 sibling assertion (section 5); add mock-data checks:
    the default team shows "Share of team production", Offense pressed, four offense rows in AC7
    order, Touches row leader matches `/^Leader: Barkley \d+%$/`; Defense shows the four defense
    rows; unit persists across chip change, season change and a breakdown -> compare -> breakdown
    round trip (AC12); section absent in compare and Players modes (AC9).
  - `components/teams/noLeagueLiterals.test.ts`: add every new source (`shareModel.ts`,
    `useRoster.ts`, `useRosterUnits.ts`, `UnitToggle.tsx`, `ShareRow.tsx`, `ShareLegend.tsx`,
    `ShareOfProduction.tsx`) to `sources`; extend `leagueValues` with `rosterUnitDefs()` keys,
    labels, groups and share labels and roster player names from `ROSTERS`; add planted-literal
    checks (`'touch'`, `"Offense"`, `"Passes Defended"`, a player name); keep the no-`data/` import
    check; assert `lib/shares.ts` holds no literals either (separate small scan or add it to the
    list).
  - Files: `App.teams.test.tsx`, `components/teams/noLeagueLiterals.test.ts`.
  - ACs: AC7 (end to end), AC9, AC12, AC17, AC30, AC31.
- T9: Quality gate and manual checks.
  - Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run format`, `npm run build` in
    `web/`; fix findings without weakening tests.
  - Dev server at 375px and 1280px: no horizontal scroll, rows stack at 375px with label, bar and
    leader fully visible, toggle wraps; desktop grid matches the design; Tab through segments shows
    the tooltip unclipped with a visible focus ring; hover shows the `title`. Note results for the
    PR.
  - Files: none expected.
  - ACs: AC29, AC32.

## 8. Open questions

None blocking. Defaults applied; can be changed at review.
1. Contract (A1): a new required `DataProvider.getRosterUnits` plus optional `StatDef.shareLabel`,
   inherited by T17 and T22. Acceptable?
2. Tab stops (A8): every positive segment is a tab stop (up to 28 for the mock offense). Keep, or
   switch to one focusable bar per row with a text list in T18?
3. Rounding (A2): largest remainder can differ by 1 from the design's per-segment `Math.round`.
   Acceptable?
4. Breakpoint: stacking below 480px reuses the only existing breakpoint. Prefer a wider one (for
   example 640px) so the bar is never narrower than about 100px?
5. With an unknown `state.unit`, the plan skips the `getRoster` call entirely (rather than calling
   and letting it reject). Fine as a refinement of AC26/AC28?
