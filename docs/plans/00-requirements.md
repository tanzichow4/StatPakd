# T17 requirements: Sortable roster table

Source ticket: `docs/tickets/T17-roster-table.md` (its acceptance criteria are the contract).
Design references: `design_handoff_statpakd/README.md` line 50 (roster table) and line 71
(`tSort: { k, d }`); `design_handoff_statpakd/design/StatPakd App.dc.html` markup lines 178-188
(heading, scroll container, header row, body rows, snap mini bar, caption) and script lines 210-211
(`OFF_COLS`, `DEF_COLS`), 425 (`sorted`), 437 (`cols` grid template), 438-442 (`heads`, `rows`,
`cells`, leader rule, cell text), 451 (unit toggle resets `tSort` to `snap` desc).

Merged building blocks to reuse (do not change their existing behaviour unless stated below):
- `web/src/components/teams/` (T15/T16): `TeamBreakdown` renders team chips, the header card and
  `ShareOfProduction` (heading, `UnitToggle`, share rows, legend). Hooks `useRosterUnits()` and
  `useRoster(teamId, unitKey | null, season)`; `shareModel.ts` (`findUnit`, `legendItems`);
  `UnitToggle` dispatches `setUnit` only when the clicked unit differs from `state.unit`.
- `web/src/domain/types.ts` (T03/T16): `RosterUnitDef { key, label, stats: StatDef[] }`, whose
  non-`extra` stat defs are the roster table columns (documented on the type);
  `RosterEntry { id, name, position, number?, stats }`; `StatValue = number | null`.
- `web/src/data/nfl/rosterUnits.ts` (T16): offense defs `snap, touch, tgt, scrim, td, ypt`
  (labels "Snap %", "Touches", "Targets", "Scrim Yds", "TD", "Yds / Touch"; `ypt` 1 decimal); defense
  defs `snap, tkl, sk, take(extra), int, pd, ff` (labels "Snap %", "Tackles", "Sacks", "Takeaways",
  "INT", "Pass Def", "Forced Fum").
- `web/src/state/appState.ts` (T06): `tSort: RosterSort { k: string; d: -1 | 1 }` initialised to
  `{ k: LeagueUiDefaults.sortKey, d: -1 }` (`'snap'` for the NFL); action `sortRoster { key }`
  (same key flips direction, new key starts at desc `-1`); `setUnit` resets `tSort` to
  `{ k: defaultSortKey, d: -1 }`. `setTeam` and `setSeason` leave `tSort` unchanged.
- `web/src/lib/stats.ts`: `formatStat`, `NULL_PLACEHOLDER` ("—"). `web/src/styles/series.ts`:
  `seriesColor(i)`. `web/src/components/compare/CompareTable` (T10): semantic table inside a
  focusable, bordered `overflow-x: auto` container; precedent for 375px behaviour.
- `web/src/test/fixtureProvider.ts`: invented-league fixture provider for component tests.

## Goal

In Team breakdown mode, below the share-of-production section, show a "Roster" table of the selected
team's players for the selected unit, one column per non-extra roster stat, sortable by clicking a
column header (descending first, then ascending), with a mini bar in percentage columns and a black
pill on each column's team leader. The same Offense/Defense toggle drives both sections, and columns,
labels and formatting come from the DataProvider's roster unit definitions so components stay
league-agnostic.

## Acceptance criteria

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

## Out of scope

- Changing the share-of-production section, the unit toggle look, team chips or the header card.
- Changing reducer semantics of `sortRoster`/`setUnit`, or persisting the sort per unit.
- Sorting by the Player column, multi-column sort, or `lowerIsBetter`-aware leaders (no roster stat
  uses `lowerIsBetter`; leaders are always the maximum).
- Sticky header or sticky first column, row hover/selection, row click to open a player.
- Showing `extra` stats (e.g. Takeaways) as columns or offering a column picker.
- Responsive/accessibility polish beyond AC20/AC23 (T18), e2e tests (T19), pixel fidelity pass
  (T20), the "Sample data for design purposes." footer, the Python API serving the new `StatDef`
  field (T22 inherits it).
- Animations of sorting or bars.

## Assumptions

No human input was requested; each default below follows CLAUDE.md, `docs/plan.md`, the T16 contract
and the design handoff.

- A1 (columns = non-extra defs): T16 marked `take` as `extra` precisely so T17 can take non-extra
  defs as columns; the resulting sets match the ticket's column lists exactly, so extra stats are not
  table columns.
- A2 (sort state): use the existing global `state.tSort` and `sortRoster`/`setUnit` actions (design
  keeps `tSort` in app state; README line 71). Ticket "resets sort to Snap % desc" is implemented as
  "reset to `LeagueUiDefaults.sortKey` desc", which is `snap` for the NFL; this is already what
  `setUnit` does. Team and season changes keep the sort (design and current reducer).
- A3 (percentage marker): the design hard-codes `k === 'snap'` for the `%` suffix and the mini bar;
  components may not name `snap`, so a new optional `StatDef` marker (e.g. `percent?: boolean`,
  meaning "0-100 percentage") is added, following the T15 `summaryLabel` / T16 `shareLabel`
  precedent. The planner picks the name. Any column so marked gets both suffix and bar.
- A4 (nulls and ties): ticket overrides the design (design maps null to -1, which puts nulls first in
  ascending order and uses an unspecified tie order). Nulls, missing and non-finite values go last in
  both directions; ties keep roster order in both directions.
- A5 (`aria-sort` placement): `aria-sort` is only valid on `columnheader`/`rowheader`, so it goes on
  the header cell that contains the button, not on the button. Unsorted sortable headers carry
  `aria-sort="none"`; the Player header carries none. The ticket's "headers are buttons with
  aria-sort" is read as this pairing.
- A6 (leader rule): follows the design (`v != null && v > 0 && v === max`), so all tied leaders get
  the pill and a one-player roster still has a leader (unlike `bestIndex`, which needs 2 values).
  Snap % and Yds / Touch columns get pills too, as in the design.
- A7 (leader accessibility): visually hidden "team leader" text added so the black pill is not the
  only signal; small, cheap and testable. Full a11y review remains T18.
- A8 (placement): the roster section goes directly below the share legend, inside breakdown mode,
  matching the design order. Whether it is a sibling of `ShareOfProduction` in `TeamBreakdown` or a
  part of it is the planner's choice; there must be exactly one unit toggle and both sections must
  show the same unit, team and season. Sharing a single roster load between the two sections is
  preferred (avoids the two sections briefly showing different rosters) but not required.
- A9 (caption): the design shows the caption below the table as plain text; keep it below, visible,
  and associate it with the table (e.g. `aria-describedby`) rather than an HTML `<caption>` above.
- A10 (number formatting): `formatStat` with the column def replaces the design's per-key branches
  (`ypt` toFixed(1) is `decimals: 1` in the data; others en-US grouping).
- A11 (player colour and meta): colour by unsorted roster index, so a player's square matches the
  share legend and segments. Meta format follows the design `pos · #num`, falling back to the
  position alone when `number` is missing (it is optional in `RosterEntry`).
- A12 (375px): same pattern as T10's compare table: the design's `overflow-x: auto` container with an
  820px minimum inner width; page itself never scrolls horizontally. The scroll region is focusable
  so keyboard users can scroll it.
- A13 (empty roster): renders the header row with no body rows and no pills; nothing throws.
- A14 (header activation): native buttons, so Enter/Space activate sorting with no extra code.
- A15 (autobuild): planner's open questions resolved by defaults: StatDef.percent accepted as contract (T22 inherits); ShareOfProduction gets optional renderAfter(unit, roster) so one roster load feeds both sections; empty cells include hidden 'not applicable' text now (as in the compare table); non-finite values treated as missing everywhere.

## Open questions

None blocking. Non-blocking, for the human to confirm later:
1. Is a new optional `StatDef` percentage marker (A3) acceptable as part of the contract T22
   inherits, or should the percentage format be expressed differently (e.g. a generic `suffix`
   field)?
2. Should the sort be reset to the default when the team changes as well (A2 keeps it, as the design
   does)?
3. Is visually hidden "team leader" text (A7) wanted now, or deferred entirely to T18?
