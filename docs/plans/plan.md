# Plan: T17 Sortable roster table

Source: `docs/tickets/T17-roster-table.md`. The contract is `docs/plans/00-requirements.md`:
AC1 to AC27 and assumptions A1 to A14. This plan runs without stopping for approval. The defaults
for the three non-blocking questions apply: the optional `StatDef` percentage field is accepted,
changing team keeps the sort, and visually hidden "team leader" text is included.

## 1. Goal and out of scope

Goal: in Team breakdown mode, below the share-of-production section, show a "Roster" table of the
selected team's players for the selected unit. It has one column per non-extra roster stat, sorts by
column header (descending first, then ascending), shows a mini bar in percentage columns and a black
pill on each column's team leader. The single Offense/Defense toggle drives both sections, and
columns, labels and formatting come from the DataProvider's roster unit definitions, so components
stay league-agnostic.

Out of scope (from the requirements):
- Changes to the share-of-production section, the unit toggle look, team chips or the header card.
- Changes to the reducer semantics of `sortRoster`/`setUnit`, and keeping a separate sort per unit.
- Sorting by Player, multi-column sort, and `lowerIsBetter`-aware leaders.
- Sticky header or first column, row hover or selection, opening a player by clicking a row.
- `extra` stats as columns, and a column picker.
- Responsive and a11y polish beyond AC20/AC23 (T18), e2e (T19), pixel fidelity (T20), the "Sample
  data" footer, and the Python API serving the new `StatDef` field (T22).
- Animations of sorting or bars.

## 2. Acceptance criteria (copied from 00-requirements.md, same numbers)

Sort function (pure)
- AC1: A pure, exported sort function takes a roster (`RosterEntry[]`), a stat key and a direction
  (`-1` descending, `1` ascending) and returns a new array; the input array and entries are not
  mutated.
- AC2: Entries with a numeric value for the key are ordered by value in the given direction.
- AC3: Entries whose value is `null`, missing (key absent) or not finite (`NaN`, `Infinity`) are
  placed after all numeric entries in both directions, keeping their original relative order.
- AC4: Ties (equal values) keep their original roster order in both directions (ascending is not a
  reversal of descending for tied entries).
- AC5: An empty roster returns `[]`; a key that no entry has returns the roster in original order.
  Unit tests cover AC1-AC5, including a mixed case such as values `[3, null, 5, 3, undefined, 5]`
  -> desc order by index `[2, 5, 0, 3, 1, 4]`, asc `[0, 3, 2, 5, 1, 4]`.

Data contract (percentage marker)
- AC6: A stat definition can be marked as a 0-100 percentage through one new optional `StatDef`
  field (see A3). For a percentage stat, cells show the formatted value followed by `%` (e.g.
  "87%") and include the mini bar (AC17). For the mock NFL league, `snap` is marked as a percentage
  in both units and no other roster stat is; a data-layer test asserts this. No other provider
  method or type changes; existing provider/contract tests still pass.

Placement and structure
- AC7: In Teams + breakdown mode, below the share-of-production legend, a roster section renders
  with an `h2` "Roster" (18px/600), the table, and below the table the caption text
  "Click a column to sort · Black = team leader" (12px, `#7A7A75`; `·` is U+00B7). Vertical gap
  between heading, table and caption is 8px.
- AC8: The roster section is not rendered in compare mode or Players mode, nor when the header card
  is not rendered (T15 cases), nor while the unit definitions or roster are loading, nor if either
  load fails, nor when `state.unit` matches no unit (same rules as T16 AC27/AC28). Nothing throws and
  no error text is required.
- AC9: The table is a semantic table (table / column headers / row headers / cells exposed with the
  matching ARIA roles, as T10's compare table) with an accessible name that identifies it as the
  roster (e.g. "Roster"), and the caption text is associated with it as its description.
- AC10: Columns are, in order: a "Player" column, then one column per stat definition of the selected
  unit that is not `extra`, in definition order, headed by the definition's `label`. For the mock
  data: Offense "Snap %", "Touches", "Targets", "Scrim Yds", "TD", "Yds / Touch"; Defense "Snap %",
  "Tackles", "Sacks", "INT", "Pass Def", "Forced Fum" (Takeaways is not a column).
- AC11: One body row per roster entry of the selected unit, ordered by the sort function (AC1-AC5)
  using `state.tSort.k` and `state.tSort.d`. If `state.tSort.k` is not one of the visible stat
  columns, rows are in roster order and no column is marked sorted.

Headers and sorting
- AC12: Each stat column header contains a button whose accessible name is the column label (the
  arrow glyph is hidden from assistive technology). The "Player" header is not a button and is not
  sortable.
- AC13: The column header (`columnheader`) of the sorted column has `aria-sort="descending"` when
  `tSort.d` is `-1` and `aria-sort="ascending"` when it is `1`; every other stat column header has
  `aria-sort="none"`. The Player header has no `aria-sort`.
- AC14: Visually, the sorted column's header shows its label followed by `↓` (descending) or `↑`
  (ascending) in `#111`; unsorted headers show no arrow in `#7A7A75`.
- AC15: Clicking (or activating with Enter/Space) an unsorted column's header sorts by that column
  descending; clicking the sorted column's header flips the direction (desc -> asc -> desc ...). This
  uses the existing `sortRoster` action.
- AC16: Switching the unit with the shared Offense/Defense toggle (the one in the share section; there
  is only one toggle on the page) switches the table's columns and rows to that unit and resets the
  sort to the league's default sort key, descending (mock data: "Snap %" desc), even if another
  column or ascending order was active. Clicking the already-active unit changes nothing (sort is
  kept). Changing the team chip or season keeps the current sort and reloads the rows.

Cells
- AC17: Stat cells are right aligned. The value text uses `formatStat` with the column's definition
  (en-US grouping, `decimals` honoured, e.g. Yds / Touch "4.8"), with `%` appended for percentage
  stats (AC6). `null` or missing values show "—" and are never shown as "0", "NaN", "null" or
  "undefined".
- AC18: Percentage-stat cells show, below the value, a 72x4 mini bar (radius 2, track `#EDEDE9`,
  fill `#111`) whose fill width is the value as a percentage, clamped to 0-100. A `null`/missing
  value shows an empty track. The bar is decorative (hidden from assistive technology). Non-percentage
  cells have no bar.
- AC19: Team leader: in each stat column, every entry whose value equals the column's maximum
  value among the unit's roster, and is greater than 0, shows its value in a black pill (background
  `#111`, white text, padding 2px 8px, radius 5); all tied leaders get the pill. A column whose values
  are all `null`/missing/0 or negative has no pill. A one-player roster with a positive value gets
  the pill. Leaders do not depend on the sort order.
- AC20: Each leader cell also exposes that it is the team leader to assistive technology (for example
  visually hidden text "team leader"), so the meaning is not conveyed by colour alone.
- AC21: The Player cell (a row header) shows a 10x10 colour square (radius 2) in the player's legend
  colour (`seriesColor` of the player's index in the unsorted roster, so it matches the share legend
  regardless of sort), the full name (14px/600, no wrapping) and below it the meta line
  `` `${position} · #${number}` `` (12px, `#7A7A75`); when `number` is absent the meta line is just
  the position.

Layout and styling
- AC22: The table sits in a container with a 1px `#E6E6E3` border and radius 12. At desktop widths
  each row is a grid of `minmax(220px, 1.6fr)` followed by one `minmax(96px, 1fr)` per stat column,
  with a table minimum width of 820px. Header row: background `#FAFAF8`, bottom border `#E6E6E3`,
  header cells padding `12px 18px`, 11px/600 uppercase, letter-spacing .08em. Body rows: bottom border
  `#F0F0ED`, player cell padding `10px 18px`, stat cell padding `8px 18px`, value Geist Mono 15/500.
- AC23: At a 375px viewport the page has no horizontal scroll: the table scrolls horizontally inside
  its bordered container (keyboard focusable scroll region with an accessible name, as T10), and the
  heading and caption stay within the viewport.

League-agnosticism and regressions
- AC24: No component, hook or model added or changed by T17 contains league-specific names or stat
  keys (`snap`, `off`, `def`, "Snap %", "Offense", player names, "NFL", etc.); the `noLeagueLiterals`
  tests still pass. The percentage behaviour, column set and labels come only from the stat
  definitions.
- AC25: T16 behaviour (share rows, legend, toggle) is unchanged; existing tests are not deleted or
  weakened.

Tests
- AC26: Unit tests for the sort function cover AC1-AC5. A data-layer test covers AC6 (and that the
  non-extra NFL defs give the AC10 column sets). Component tests (Vitest + Testing Library, invented
  fixture units, stats and roster including `null` values, a tie and a percentage stat) cover:
  column set and order with an `extra` stat excluded (AC10), sort toggle desc -> asc -> desc on one
  column and switching column back to desc (AC13-AC15), arrows (AC14), `aria-sort` values (AC13),
  nulls last in both directions and stable ties in the rendered rows (AC3/AC4/AC11), unit switch
  resetting the sort (AC16), leader pill including tied leaders and an all-null/zero column (AC19,
  AC20), "—" for null (AC17), mini bar presence and width (AC18), player colour independent of sort
  (AC21), unknown sort key (AC11), and loading/failure/unknown unit rendering nothing (AC8).
- AC27: `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass in `web/`.

Added: none. One near-gap is handled as a rule inside the existing ACs, not as a new behaviour:
`formatStat(NaN)` returns "NaN" and `formatStat(Infinity)` returns "∞". The model therefore treats
any non-finite value as missing for display, bar and leader as well as for sorting (consistent with
AC3 and AC17). Tested in T2.

## 3. Architecture

Approach: same pattern as T15/T16, with a pure model and thin components. There is one additive
optional `StatDef` field and no reducer, provider-method or hook change. All new UI lives in
`web/src/components/teams/`, which is already scanned for league literals. The sort state is the
global `state.tSort`, changed through the existing `sortRoster`/`setUnit` actions (A2).

Domain, `web/src/domain/types.ts`
- `StatDef.percent?: boolean`, doc comment: "True when the value is a 0-100 percentage: the roster
  table appends `%` and shows a mini bar." Name chosen per A3 (short, boolean, mirrors `extra`).

NFL data, `web/src/data/nfl/rosterUnits.ts`
- `snap` gains `percent: true` in `off` and `def`. Nothing else changes.

Single roster load (A8): one load is shared with the share section, and `ShareOfProduction`'s
existing props and T16 output stay the same.
- `ShareOfProduction` gains one optional prop
  `renderAfter?: (unit: RosterUnitDef, roster: RosterEntry[]) => ReactNode`. Inside the existing
  `unit && roster` condition it renders `renderAfter(unit, roster)` as a sibling after its
  `<section>`, wrapped in a fragment. If the prop is absent the output is identical to T16, so all
  `ShareOfProduction.test.tsx` cases stay untouched.
- `TeamBreakdown` passes
  `renderAfter={(unit, roster) => <RosterSection unit={unit} roster={roster} />}`.
- Result: `getRoster` is still called once per team/unit/season. Both sections always show the same
  roster and appear on the same render. AC8's loading, failure and unknown-unit rules come for free
  from the existing `unit && roster` gate, and compare, Players and no-card cases come from
  `TeamBreakdown`.
- Rejected alternative: a second `useRoster` call inside `RosterSection`. It is simpler, but it
  doubles provider calls, lets the two sections briefly show different loads, and would force a
  rewrite of the T16 "called once" assertion.

Pure model, `web/src/components/teams/rosterModel.ts` (no React)
- `finiteValue(v: StatValue | undefined): number | null` returns `v` when it is a finite number,
  otherwise `null`.
- `sortRosterEntries(roster: readonly RosterEntry[], key: string, dir: SortDir): RosterEntry[]`
  (AC1-AC5). It splits the entries into numeric and non-numeric while keeping their order. The
  numeric entries are sorted on a copy of `{ entry, i, v }` with the comparator
  `dir * (a.v - b.v) || a.i - b.i`, and the non-numeric entries are appended in original order.
  Entries are returned by reference and never cloned or mutated. `SortDir` is imported from
  `state/appState` (type only) or redeclared as `-1 | 1`.
- `tableColumns(unit: RosterUnitDef): StatDef[]` returns the non-`extra` defs in definition order
  (AC10).
- `columnLeaders(roster, def): Set<EntityId>`. It takes the max of the finite values; when the
  max is above 0, every id whose value equals the max is a leader, otherwise the set is empty
  (AC19, A6).
- `cellText(v, def)` returns `NULL_PLACEHOLDER` when the value is not finite, otherwise
  `formatStat(v, def)` plus `%` if `def.percent` (AC17).
- `barPercent(v)` returns 0 when the value is not finite, otherwise the value clamped to 0..100
  (AC18).
- `playerMeta(entry)` returns `` `${position} · #${number}` ``, or just `position` when `number` is
  `undefined` (AC21).
- `buildRosterTable(unit, roster, sort: { k, d })` returns `{ columns, rows }`.
  - `columns: { key, label, percent, ariaSort: 'descending' | 'ascending' | 'none', arrow: '↓' |
    '↑' | null }[]`. Only the column with `key === sort.k` is sorted. If no column matches, every
    column is `none` with no arrow (AC11, AC13, AC14).
  - `rows: { id, name, meta, color, cells: { key, text, leader: boolean, bar: number | null }[] }[]`.
    The colour is `seriesColor(indexInUnsortedRoster)` (AC21) and leaders come from the unsorted
    roster (AC19). `bar` is `null` for non-percent columns. Rows are sorted with
    `sortRosterEntries` only when `sort.k` is a visible column, otherwise they keep roster order
    (AC11).

Components, `web/src/components/teams/`
- `RosterTable.tsx` + `RosterTable.module.css` (presentational). Props: `columns`, `rows`,
  `labelledBy`, `describedBy`, `onSort(key)`.
  - Outer `div.frame` (border, radius 12, `overflow-x: auto`, `max-width: 100%`). It is also the
    scroll region: `role="region"`, `aria-label="Roster table"`, `tabIndex={0}`, with the same oxlint
    disable comment as CompareTable. It is a `div`, not a `section`, so it adds no `<section>`
    element.
  - `<table role="table" aria-labelledby={labelledBy} aria-describedby={describedBy}
    style={{ minWidth: 820 }}>`. Explicit row, rowgroup, columnheader, rowheader and cell roles are
    set, as in CompareTable, because grid display strips the native roles. Grid template is
    `minmax(220px, 1.6fr) repeat(n, minmax(96px, 1fr))` via inline style.
  - Player header: `<th role="columnheader" scope="col">Player</th>`, with no button and no
    `aria-sort` (AC12, AC13).
  - Stat header: `<th role="columnheader" scope="col" aria-sort={col.ariaSort}>` containing
    `<button type="button" onClick={() => onSort(col.key)}>{label}<span aria-hidden="true">
    {arrow}</span></button>`. The arrow span renders only when `arrow` is set. The sorted state
    gets a `.sorted` class (`#111`), the unsorted state uses `#7A7A75`. The button is a reset
    button inheriting the header font and gets a `:focus-visible` ring (AC12-AC15, A5, A14).
  - Row header cell: a swatch `span` (`aria-hidden`, 10x10, radius 2, background colour), the name
    (14px/600, `white-space: nowrap`) and the meta line (12px, `#7A7A75`) (AC21).
  - Stat cell, right aligned:
    - The value is a mono span. A leader value goes inside a `.leader` pill span (`#111`, white,
      `2px 8px`, radius 5) followed by `<span className={srOnly}> team leader</span>` (AC19,
      AC20).
    - When `bar !== null`, a `.bar` track (72x4, radius 2, `#EDEDE9`, `aria-hidden="true"`) with a
      `.fill` child (`#111`, `width: ${bar}%`) follows (AC18).
    - `srOnly` uses the CompareTable visually hidden rule.
  - The ui `Pill` is not reused: its padding and radius (3px 9px, 6) differ from AC19.
- `RosterSection.tsx` + `RosterSection.module.css` (container). Props: `unit`, `roster`. It reads
  `state.tSort` and `dispatch` via `useAppState`.
  - Builds the model with `useMemo(buildRosterTable(unit, roster, state.tSort))`. `onSort`
    dispatches `{ type: 'sortRoster', key }` (AC15).
  - Renders `<section aria-labelledby={headingId}>` containing the `h2` "Roster", the
    `RosterTable`, and `<p id={captionId}>Click a column to sort · Black = team leader</p>`. It uses
    a flex column with an 8px gap and `min-width: 0`, so the section never widens the page (AC7,
    AC23).
- `index.ts`: export `RosterSection` if the folder's index exports siblings.

Dependencies, config and env: none new, and `.env` is not touched. The only contract change is the
optional `StatDef.percent`, which T22 inherits.

## 4. Design

User flow: in Teams + breakdown the page shows the chips, the card and "Share of team production"
with its legend, then "Roster". The table lists the offense roster sorted by "Snap % ↓". Each Snap
% cell shows "87%" over a thin bar, and the top value in each column sits in a black pill. Clicking
"Touches" sorts by Touches descending, and clicking it again sorts ascending with "↑". Players
without a value stay at the bottom both ways. Clicking Defense in the share toggle swaps both
sections, and the table resets to "Snap % ↓". Changing the team or season reloads the rows and keeps
the current sort.

States
- Compare mode, Players mode, teams loading or failed, or unknown team: no card, so no share or
  roster section (AC8).
- Unit defs loading or failed: no share section, so no roster section (AC8).
- Roster loading or failed: the share header and toggle only, with no roster section (AC8).
- Unknown `state.unit`: there is no unit, so no roster section and no `getRoster` call (AC8).
- Empty roster: the header row shows with no body rows and no pills (A13).
- Unknown `tSort.k` (for example the fixture default `zscore`): rows stay in roster order, every
  header is `none` and no arrow shows (AC11).
- Success: sorted rows, leaders, bars and the caption (AC10-AC21).
- Superseded loads: the existing `useRoster` stale guard returns `null`, so neither section shows
  old data.

Desktop (1280px): the full grid fits without scrolling (220 + 6 x 96 = 796 min, 820 min table, wider
container). Header row background `#FAFAF8`. Cell paddings, borders and fonts follow AC22, using
existing CSS tokens where they exist (ink, muted, border, mono font).

Mobile (375px): the frame keeps its border and scrolls horizontally inside the page. The table keeps
`min-width: 820px`. The section and its parent get `min-width: 0` so the grid or flex parent cannot
blow out. The heading and caption wrap normally. The page itself has no horizontal scroll (AC23),
which is checked manually in T5.

Accessibility
- The section is labelled by its `h2`. The table is named "Roster" (via `aria-labelledby` on the
  heading) and described by the caption.
- The sortable headers are native buttons inside `columnheader` cells carrying `aria-sort`. The
  arrow is `aria-hidden`, and Enter and Space work natively.
- Leader cells add sr-only " team leader". The mini bar is `aria-hidden`. Player cells are row
  headers, so a screen reader announces the player for each cell.
- The scroll region is focusable and named "Roster table". There is a visible focus ring on header
  buttons and on the region.

## 5. Risk and security

- Input validation: values come from the provider and may be `null`, missing, `NaN`, `Infinity`,
  negative or above 100 (in a percent column). `finiteValue` guards every use (sort, text, bar and
  leader), so "NaN", "∞", "null" and "undefined" can never render, and the bar width is always
  0-100%. Safeguard: model tests per bad value, plus a rendered-text scan (T2, T3).
- Auth and data exposure: none. Provider data renders as React text nodes and the colour goes into
  inline style. There is no HTML injection path.
- Failure modes and safeguards:
  - The roster and share sections could drift, so the roster load is shared through `renderAfter`.
    A test asserts `getRoster` is called once and that both sections switch together (T4).
  - Grid display strips table semantics, so explicit roles are set as in CompareTable. A role test
    covers this (T3).
  - `aria-sort` on the button would be invalid. It goes on the `th`, which a test asserts (T3).
  - Tied leaders and a one-player roster are covered by explicit model tests (T2).
  - Page-level horizontal scroll at 375px. Safeguard: `min-width: 0` on the section, the frame
    scrolls, and a manual check in T5.
  - T16 tests that pin "nothing after the share section" become false. They are rewritten to the
    new contract and never deleted or weakened (T4):
    - `TeamBreakdown.test.tsx` lines 111-122 (`share.nextElementSibling` is null, no `table`,
      2 sections) becomes: the share section is followed by the region "Roster", that region has
      no next sibling, the only table is named "Roster", there are 3 sections, and there is still
      no "coming soon".
    - `App.teams.test.tsx` lines 96-98 get the same rewrite.
    - `App.teams.test.tsx` line 80 (`queryByRole('table')` absent on entering breakdown) asserts
      that the compare table is gone. It becomes: no table named "Selected teams compared by stat",
      and after load the only table is the "Roster" table.
    - `TeamBreakdown.test.tsx` helper `card()` at line 95 (first region not named SHARE_TITLE)
      also excludes "Roster" and "Roster table", so it cannot pick a roster region if the order
      ever changes.
  - Unscoped text queries that might now match roster cells: review
    `TeamBreakdown.test.tsx:268` (`/3031/`) and `App.teams.test.tsx:332, 489` (`/ · 2023$/`). The
    fixture and mock values cannot produce these strings (meta lines end in `#n`), so no change is
    expected. Confirm when running the tests in T4.
  - League literals: the scan gains the new files and planted `'snap'` / `"Snap %"` checks (T4).

## 6. Gaps check

- Auth: not applicable (read-only, no user data).
- Validation: null, missing, NaN, Infinity, negative and >100 values; empty roster; unknown sort
  key; unknown unit; one-player roster.
- Error handling: roster or unit load failure renders no roster section and nothing throws (AC8).
- Mobile: horizontal scroll inside a focusable bordered frame, `min-width: 0` guard, manual
  375px/1280px check (AC23, T5).
- Accessibility: semantic table with roles, name and description; `aria-sort` on the headers;
  button headers; sr-only leader text; decorative bars hidden; focusable scroll region.
- Config and env vars: none. `.env` is untouched.
- Tests: sort unit tests, model tests, data test, presentational and container tests, TeamBreakdown
  and App integration, literal scan, full gate.

## 7. Tasks

Each task is one commit with its tests. Paths are under `web/src/`.

- T1: Percentage marker in the contract and the NFL data.
  - Add `StatDef.percent?: boolean` with the doc comment to `domain/types.ts`.
  - Set `percent: true` on `snap` in both units in `data/nfl/rosterUnits.ts`.
  - Mark fixture `zsnap` `percent: true` in both units in `test/fixtureProvider.ts`. It is not a
    share stat, so T16 output does not change.
  - `data/nfl/data.test.ts`: assert that the only percent defs are `snap` in `off` and `def`, and
    that the non-extra labels per unit equal the AC10 lists exactly.
  - `domain/domain.test.ts`: `percent` is optional and boolean, following the `shareLabel` case.
  - Files: `domain/types.ts`, `data/nfl/rosterUnits.ts`, `data/nfl/data.test.ts`,
    `domain/domain.test.ts`, `test/fixtureProvider.ts`.
  - ACs: AC6, AC10 (data), AC26.
- T2: Roster model (pure).
  - Add `components/teams/rosterModel.ts` and `rosterModel.test.ts`.
  - `sortRosterEntries` tests:
    - the AC5 mixed example in both directions;
    - nulls, missing, `NaN` and `Infinity` all last, in original order, in both directions;
    - ties stable in both directions (asc is not desc reversed);
    - `[]`, and an absent key keeping the order;
    - a new array is returned and the frozen input and entries are unchanged.
  - `tableColumns` excludes `extra` and keeps definition order.
  - `columnLeaders` tests:
    - a single max;
    - a tie (both ids);
    - all null, all zero, all negative, and mixed negative and zero (all empty);
    - a one-player positive roster;
    - non-finite values ignored;
    - independent of input order.
  - `cellText` tests: grouping ("1,234"), decimals ("4.8"), percent ("87%"), and "—" for null,
    missing, NaN and Infinity, never with `%`.
  - `barPercent` tests: 87, -5 -> 0, 140 -> 100, null -> 0.
  - `playerMeta` tests: with and without a number.
  - `buildRosterTable` tests:
    - aria-sort and arrow for desc, asc and an unknown key;
    - row order follows the sort only for visible keys, with an extra stat key giving roster order;
    - row colour is the unsorted index after sorting;
    - leader flags are the same under any sort;
    - `bar` is null for non-percent columns;
    - no output string contains "NaN", "Infinity", "∞", "null" or "undefined".
  - Files: `components/teams/rosterModel.ts`, `components/teams/rosterModel.test.ts`.
  - ACs: AC1, AC2, AC3, AC4, AC5, AC10, AC11, AC13, AC14, AC17, AC18, AC19, AC21, AC26.
- T3: `RosterTable` and `RosterSection` components.
  - Add `RosterTable.tsx` + `.module.css` and `RosterSection.tsx` + `.module.css` as in section 3.
    Export `RosterSection` from `components/teams/index.ts` if that file exports siblings.
  - `RosterTable.test.tsx` uses an invented unit and roster built in the test. It has a percent
    column, an extra stat, a null, a missing key, a tie for the max, an all-null/zero column and an
    entry without `number`. Tests:
    - roles (table, rowgroup, row, columnheader, rowheader, cell);
    - the table name "Roster" and the description equal to the caption;
    - Player first, then labels in order, with the extra stat absent;
    - the Player header has no button and no `aria-sort`;
    - each stat header has a button named exactly its label, with the arrow outside the name;
    - `aria-sort` values on the `th`;
    - the arrow text, and the sorted/unsorted classes;
    - `onSort` is called with the key on click and on Enter/Space via `userEvent.keyboard`;
    - "—" for null and missing;
    - "%" only in the percent column;
    - pill and " team leader" on every tied leader, with no pill in the all-null/zero column;
    - the bar is present only in the percent column, `aria-hidden`, with fill width `87%`, `0%`
      for null and clamped at 100;
    - the swatch colour and the meta line with and without a number;
    - the scroll region is named "Roster table", focusable (`tabIndex` 0) and contains the table;
    - the table `minWidth` is 820px;
    - an empty roster renders the header row and no body rows.
  - `RosterSection.test.tsx` with `AppStateProvider` and a state probe. Tests:
    - the `h2` "Roster" and the caption text with U+00B7 below the table;
    - with defaults `sortKey: 'zsnap'`: the initial "Zsnap" is descending;
    - clicking another header sorts it descending, then ascending, then descending, and switching
      back to a different column starts at descending (state probe `tSort` and rendered row order);
    - nulls stay last and ties stay stable in the rendered rows in both directions;
    - player colours stay with the player after sorting;
    - the fixture default `sortKey: 'zscore'` gives roster order with no column sorted.
  - Files: `components/teams/RosterTable.tsx`, `RosterTable.module.css`, `RosterTable.test.tsx`,
    `RosterSection.tsx`, `RosterSection.module.css`, `RosterSection.test.tsx`,
    `components/teams/index.ts`.
  - ACs: AC3, AC4, AC7, AC9, AC10, AC11, AC12, AC13, AC14, AC15, AC17, AC18, AC19, AC20, AC21,
    AC22, AC26.
- T4: Wiring below the share section, regressions and literal scan.
  - `ShareOfProduction.tsx`: add the optional `renderAfter` prop (section 3).
    `ShareOfProduction.test.tsx` adds cases for it, and the existing cases stay unchanged:
    - it is called with the current unit def and roster;
    - its output is the next sibling of the share section;
    - it is not called while units or roster are pending or rejected, or for an unknown unit;
    - with the prop absent, the DOM has no extra nodes.
  - `TeamBreakdown.tsx`: pass `renderAfter` rendering `RosterSection`.
  - `TeamBreakdown.test.tsx` with `rosterProvider`:
    - the roster section follows the share section;
    - `getRoster` is called exactly once;
    - with defaults `sortKey: 'zsnap'`, sort Zalpha ascending, then click "Zunit Two": the columns
      switch to that unit and "Zsnap" is descending again; clicking the active unit keeps the sort
      (AC16);
    - a team chip change and a season change keep `tSort` and show the new rows;
    - units pending or rejected, roster pending or rejected, unknown unit, teams pending and
      unknown team all render no "Roster" region and do not throw (AC8);
    - rewrite the superseded assertions (section 5).
  - `App.teams.test.tsx` (mock data):
    - rewrite lines 80 and 96-98 (section 5);
    - the default team shows "Roster" after the share section;
    - offense headers equal the AC10 list, with "Snap %" `aria-sort="descending"` and its arrow;
    - the first Snap % cell text matches `/^\d+%$/` and the column is non-increasing down the
      rows;
    - clicking "Touches" gives descending, then ascending;
    - clicking "Defense" gives the defense headers (no "Takeaways"), with "Snap %" descending again;
    - a chip change keeps the active sort;
    - there is no roster table in compare mode or Players mode;
    - `Yds / Touch` values have one decimal.
  - `components/teams/noLeagueLiterals.test.ts`:
    - add `rosterModel.ts`, `RosterTable.tsx` and `RosterSection.tsx` to `sources`;
    - extend the AC30 coverage list with `'snap'`, `'Snap %'`, `'ypt'`, `'Yds / Touch'` and
      `'INT'` (already in `leagueValues` through `rosterUnitDefs`);
    - add planted checks `'snap'` and `"Snap %"` against `RosterTable`;
    - the no-`data/` import check covers the new files automatically.
  - Files: `components/teams/ShareOfProduction.tsx`, `ShareOfProduction.test.tsx`,
    `TeamBreakdown.tsx`, `TeamBreakdown.test.tsx`, `App.teams.test.tsx`,
    `components/teams/noLeagueLiterals.test.ts`.
  - ACs: AC7, AC8, AC10, AC15, AC16, AC24, AC25, AC26.
- T5: Quality gate and manual checks.
  - Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run format` and `npm run build` in
    `web/`. Fix findings without weakening tests.
  - Dev server at 375px and 1280px:
    - no page-level horizontal scroll at 375px;
    - the frame scrolls and is reachable with Tab and visibly focused;
    - the heading and caption are within the viewport;
    - the desktop grid, header colours, arrows, pills, mini bars and meta lines match the design;
    - Enter and Space on a header sort;
    - the Defense toggle resets to Snap % desc.
  - Note the results for the PR.
  - Files: none expected.
  - ACs: AC22, AC23, AC27.

## 8. Open questions

None blocking. Defaults are applied and can be changed at review.
1. Contract field name (A3): `StatDef.percent?: boolean` means "0-100 percentage" (suffix plus mini
   bar). Is it acceptable for T22, or should it be a more generic `suffix`/`format` field?
2. Wiring: the roster section is rendered through an optional `renderAfter` prop on
   `ShareOfProduction` so that both sections share one roster load. Is this acceptable, or would
   you rather lift `useRosterUnits`/`useRoster` into `TeamBreakdown`? Lifting is cleaner, but it
   requires rewriting the T16 `ShareOfProduction` tests.
3. Null cells show a bare "—" (AC17). CompareTable pairs its dash with sr-only "not applicable".
   Add the same here now, or leave it to T18?
