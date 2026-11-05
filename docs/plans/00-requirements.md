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

---

# T18 requirements: Responsive and accessibility pass

Source ticket: `docs/tickets/T18-responsive-and-a11y.md` (its four acceptance criteria are the
contract; the ACs below make them testable). Design reference: `design_handoff_statpakd/README.md`
line 59 ("body rows wrap (sidebar above main on narrow), tables scroll horizontally").
Carried-over items: `docs/progress.md` "Out-of-scope ideas" for T08, T12, T14, T16.

Context found while reading the code (informs the ACs; not a design):
- Views: Players compare and Teams compare (picker, sidebar, tabs Table / Bars / Radar / 3D, empty
  state), Add popover open, add-stat menu open, Teams breakdown (chips, header card, share of
  production, roster table) for each unit. `/dev` (DevPage) is a developer page, not a product view.
- Text colour tokens in `web/src/styles/tokens.css` and their approximate contrast on white:
  `--color-text-muted #7A7A75` ~4.3:1, `--color-text-label #8A8A85` ~3.5:1, `--color-text-faint
  #9A9A95` ~2.8:1, `--color-text-na #B5B5B0` ~2.1:1 (all below the 4.5:1 AA threshold for their
  11-15px sizes, and lower again on `#FAFAF8` header rows). So not only the two colours the ticket
  names fail: the most widely used muted colour fails too. `TeamModeSwitch.module.css` also
  hard-codes `#7a7a75`. `--color-nav-soon #6A6A66` on the dark nav is ~3.5:1 (used for the
  disabled "Soon" leagues).
- No live regions exist (`aria-live` / `role="status"` appear nowhere in `web/src`).
- Controls smaller than 40px: `IconButton` 26x26 (entity remove ×), `EntityCard` 26px elements,
  share segments 30px tall; others (checkbox rows, chips, segmented controls, tabs, selects) are not
  yet measured.
- Each share segment is its own Tab stop (`tabIndex={0}`), giving 27 Tab stops on mock offense.
- Global `:focus-visible` outline is `2px solid #2F5FD0`; no rule removes outlines.
- No axe tooling is installed; Vitest runs in jsdom, where axe's `color-contrast` rule cannot
  compute rendered colours.

## Goal

Make every StatPakd view usable at 375px, 768px and 1280px widths and operable with keyboard and
assistive technology, with no serious or critical axe issues. Contrast problems are fixed only where
needed to pass, and every contrast decision is recorded in a docs file for later design sign-off.

## Acceptance criteria

Views and widths. Unless stated otherwise, "every view" means: (V1) Players compare with the
default selection, on each tab Table, Bars, Radar and 3D; (V2) Teams compare, same four tabs;
(V3) the empty state (no entities selected); (V4) Add popover open (Players, with position chips);
(V5) add-stat menu open; (V6) Teams breakdown, Offense and Defense. "Checked widths" means 375x667,
768x1024 and 1280x800 CSS px viewports.

Responsive layout

- AC1: For every view at every checked width, the page has no horizontal scroll
  (`document.documentElement.scrollWidth <= clientWidth`). The compare table and roster table scroll
  horizontally inside their own bordered containers, which stay keyboard focusable with an
  accessible name.
- AC2: At every checked width no text or control is clipped or overlaps another (verified in browser
  QA by bounding boxes of headings, labels, buttons, chips, tabs and table containers), and the
  sidebar sits above the main area at 375px as today.
- AC3 (T08 carry-over): At 375x667 with the page scrolled to the top, opening the Add popover gives
  a popover whose bounding box lies entirely inside the viewport; its results list scrolls inside the
  popover and opening it does not increase the document height. At 1280x800 the popover keeps its
  design size (360px wide, results max-height 340px).
- AC4 (T12 carry-over): At 375px on the Teams radar with the default team stats, no two axis labels'
  bounding boxes intersect, no axis label's bounding box contains an outer-ring vertex, and every
  label is fully inside the chart box (no clipping).
- AC5 (T14 carry-over): At 375px on the 3D tab (Players and Teams, default camera), every axis
  label's bounding box is fully inside the chart card (none clipped by the card edge).

Touch targets

- AC6: At 375px and 768px, every interactive control (buttons including the entity remove ×, the
  Add card, popover Add/Remove/Done, position chips, team chips, tabs, segmented controls, selects,
  the search input, stat checkboxes via their clickable label, add-stat buttons and menu items,
  roster sort buttons, nav controls) has an activating element whose border box is at least 40px
  tall and at least 40px wide. Verified in browser QA by `getBoundingClientRect` on each control.
  Exemptions (listed in the a11y doc with reasons): share-of-production segments (their width
  encodes data) and the focusable scroll/chart regions (larger than 40px anyway).
- AC7: At 1280px the visual sizes match the current design-sized controls (no regression for
  desktop); any desktop control under 40px is listed in the a11y doc as a desktop exception.

Keyboard

- AC8: The full flow is operable with keyboard only, at 1280px and 375px: switch Players/Teams;
  change season; open the Add popover, type a search, filter by a position chip, add an entity,
  remove one from the popover, close with Done and with Escape; remove an entity with its card ×;
  open the add-stat menu, add a stat, close with Escape; uncheck/check a stat; switch each chart
  tab (arrow keys within the tablist); rotate the 3D chart with arrow keys and change an axis select;
  switch to Team breakdown; pick a team chip; toggle Offense/Defense; inspect share segments; sort a
  roster column both ways. Each step is covered by a component or App-level test using
  `@testing-library/user-event` keyboard interactions only (no clicks), or by an existing test that
  already does so (referenced in the plan).
- AC9: Focus is never lost to `<body>` during that flow: closing the popover (Done or Escape)
  returns focus to the Add card; closing the add-stat menu with Escape returns focus to its Add stat
  button; removing an entity with its card × moves focus to the next card's remove button, else the
  previous card's, else the Add card; removing an entity from inside the popover keeps focus in the
  popover. Tests assert `document.activeElement` after each of these.
- AC10: Tab order follows visual order at every checked width (DOM order matches visual order; no
  positive `tabindex`; no CSS `order`/reverse that changes visible order of focusable items). No
  focusable element is inside an `aria-hidden` subtree.
- AC11 (T16 carry-over): Each share-of-production row is a single Tab stop. Within a focused row,
  Left/Right arrows move between segments and Home/End go to the first/last segment; each segment
  keeps its current accessible name. With mock offense data the share section contributes at most one
  Tab stop per row (not 27 in total). Tests cover Tab count and arrow movement.
- AC12 (T16 carry-over): When a share segment has keyboard focus, its tooltip is visible and its
  horizontal centre lies within the focused segment's horizontal extent (clamped so the tooltip stays
  inside the share card). Verified in browser QA; a component test asserts the tooltip belongs to
  the focused segment.
- AC13: Every focusable element shows a visible focus indicator on keyboard focus, and that indicator
  has at least 3:1 contrast against the background it is drawn on (including the dark global nav).
  Verified by browser QA screenshots of each control type and by the contrast test (AC18) for the
  focus colour against the backgrounds it sits on.

Labels, names and live regions

- AC14: Every form control, button, tablist, region and table has an accessible name; icon-only
  buttons are named by action and target (e.g. "Remove <entity name>"). Covered by the axe tests
  (AC17).
- AC15: A single polite live region (`role="status"` / `aria-live="polite"`) is present in the DOM
  from first render (empty). Adding or removing an entity (from the popover or a card) and adding or
  removing a stat (menu or checkbox) sets its text to a message containing the verb ("added" or
  "removed", any capitalisation) and the entity name or stat label. Nothing is announced on initial
  load, on season change or on kind switch. Component/App tests cover each of the four cases and the
  no-announce cases. Messages use data-provided names only (no league literals in components).

Series encoding (non-colour)

- AC16: In every view where colour identifies a series (compare table header dots, bars, radar
  polygons, 3D points, share segments, roster colour squares), the same series and its values are
  available as text without relying on colour: a visible text label tied to the mark (entity name
  in the table headers, bars, 3D readout/name tags, share legend and roster rows) and an accessible
  text equivalent (existing radar sr-only list, share segment names, tables). A test per view asserts
  that each selected entity's name appears in the accessible content of that view. Visual
  non-colour encodings (dash patterns, marker shapes) are not implemented; they are written up as a
  proposal in the a11y doc (AC19).

Automated axe and contrast checks

- AC17: An automated Vitest test runs axe-core against the rendered App for every view V1-V6 (at the
  default jsdom size) and fails if any violation has impact "serious" or "critical". The
  `color-contrast` rule is disabled in that test only because jsdom cannot compute it (stated in a
  comment), and is covered by AC18 instead. The test lives with the other App tests and runs under
  `npm test`.
- AC18: A unit test computes WCAG contrast ratios for every text colour token (and hard-coded text
  colour) actually used for text, against each background it is used on (at least white and
  `--color-surface-subtle #FAFAF8`; dark nav surfaces for nav text), and asserts at least 4.5:1;
  and the focus colour against its backgrounds at least 3:1. Disabled-control text (nav "Soon"
  leagues, the locked last stat) is listed as an explicit, documented exemption in the test. The
  test reads the real values (e.g. parses `tokens.css`) so it fails if a token regresses.
- AC19: Browser QA (playwright-core scripts, as earlier tickets) runs axe-core with all rules,
  including `color-contrast`, on every view at 375px and 1280px against the dev or preview build and
  reports zero serious or critical violations; results are recorded in `docs/qa/T18-report.md`.

Contrast decisions document

- AC20: A file `docs/a11y.md` exists with (a) a contrast table: each text colour token or hard-coded
  colour, where it is used, its measured ratio on each background before and after, and the
  decision (changed to value X, or kept with reason), each marked "pending design sign-off"; (b) the
  touch-target and other exemptions (AC6/AC7); (c) the non-colour series encoding proposal (AC16);
  (d) the carried-over items from `docs/progress.md` and whether T18 fixed or deferred each.
- AC21: Colours are changed only where needed to pass AC18/AC19. Each changed colour is the closest
  value to the original (same hue, darkened only) that passes 4.5:1 on all its backgrounds; token
  names stay the same; no other visual change is made for contrast reasons.

Regressions and checks

- AC22: No component gains league-specific names; `noLeagueLiterals` tests still pass. Existing
  tests are not deleted or weakened; tests that pin a changed colour value or the old per-segment
  Tab behaviour are updated to the new documented behaviour, each noted in the plan.
- AC23: `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass in `web/`. Python
  checks (`ruff check .`, `pytest`) are unaffected and still pass.

## Out of scope

- Playwright test suite and CI job (T19); T18 browser checks are QA scripts, not committed e2e tests.
- Visual fidelity against the design (T20), including chip shape/border (T15 carry-over) and the
  T07 placeholder h1 note. T20 must treat the AC21 contrast changes as documented deviations.
- 3D name-tag collision avoidance with 8 selected (T14 carry-over) and real-device drag performance;
  deferred to T20 or a later ticket.
- Implementing visual non-colour series encodings (dash patterns, shapes); proposal only (AC16).
- Widths below 375px, 400% zoom reflow, `prefers-reduced-motion`, high-contrast/forced-colours modes,
  and manual screen-reader testing on real devices.
- The `/dev` page (developer-only).
- Getting design sign-off on contrast changes (recorded as pending in `docs/a11y.md`).
- League switching, new features, Python API changes.

## Assumptions

No human input was requested (unattended autobuild). Each default follows CLAUDE.md, `docs/plan.md`,
`docs/progress.md` and the design handoff.

- B1 (contrast without sign-off): the ticket asks for alternates plus design sign-off; sign-off is
  unavailable, so colours are changed only where needed to pass axe serious/critical (WCAG AA 4.5:1
  for text, all sizes here are under 18px), using the minimal darkening of the same hue, and every
  decision is logged in `docs/a11y.md` as "pending design sign-off". This includes
  `--color-text-muted #7A7A75` (~4.3:1), which the ticket did not name but which fails and would be
  flagged by axe; the hard-coded `#7a7a75` in `TeamModeSwitch` follows the token.
- B2 (N/A dash): the "—" N/A glyph is visible text conveying meaning, so `--color-text-na` must pass
  4.5:1 like other text even though it is `aria-hidden` (the hidden "not applicable" text stays).
- B3 (exemptions): text on disabled/inactive controls (nav "Soon" leagues, locked last stat) is
  exempt per WCAG 1.4.3 and axe; unselected 3D points (`--color-chart-muted`) are de-emphasised
  context marks, not text, and are documented rather than changed.
- B4 (axe tooling): add `axe-core` (single package, no runtime deps) as a dev dependency, optionally
  with a thin matcher such as `vitest-axe`; the planner chooses. If axe-core cannot run under the
  repo's jsdom/Vitest versions, the fallback is AC19 browser axe only plus AC18, and the plan must
  say so. Playwright itself is not added (T19 owns it); QA keeps using playwright-core scripts.
- B5 (touch targets): the 40px rule applies at 375px and 768px (touch-likely widths); at 1280px the
  design's sizes stay and under-40px controls are documented exceptions. Width media queries are used
  because headless QA does not report a coarse pointer. Share segments are exempt (data marks).
- B6 (carry-overs in scope): T08 popover height at 375px (AC3), T12 radar label overlap at 375px
  (AC4), T14 3D axis labels clipped at 375px (AC5), T16 27 Tab stops (AC11, via one Tab stop per row
  with arrow keys) and T16 keyboard tooltip anchor (AC12). Deferred: T14 name-tag collision with 8
  selected and device performance (feature work, not a fix); T15 chip styling and T07 h1 (T20).
- B7 (live region): one shared polite region for the app rather than one per component, so
  announcements do not compete; message wording is the planner's choice within AC15. Entity
  "full" (8 of 8) announcements are not required.
- B8 (focus after card removal): next card, else previous card, else the Add card (common
  list-removal pattern); the ticket does not specify.
- B9 (non-colour encoding): text labels and accessible text equivalents satisfy WCAG 1.4.1 for
  identification in these views; adding dash patterns or marker shapes is a design change needing
  sign-off, so it is only proposed.
- B10 (docs location): contrast and exemption decisions go in `docs/a11y.md`; the QA run goes in
  `docs/qa/T18-report.md` like earlier tickets.
- B11 (views for axe in jsdom): the App is rendered with the mock provider, as existing App tests do;
  views are reached by dispatching user interactions, not by mocking components.

## Open questions

None blocking. Non-blocking, for the human/design to confirm later:
1. Approve or replace the darkened values for `#7A7A75`, `#8A8A85`, `#9A9A95` and `#B5B5B0`
   recorded in `docs/a11y.md` (B1).
2. Should controls also meet 40px at 1280px, changing the desktop design (B5)?
3. Adopt a visual non-colour series encoding (dash patterns or marker shapes) for radar and 3D (B9)?

---

# T19 requirements: Playwright e2e tests in CI

Source ticket: `docs/tickets/T19-e2e-tests.md` (its two acceptance criteria are the contract; the
ACs below make them testable). Plan reference: `docs/plan.md` "Tests: Vitest + Testing Library
(unit/component), Playwright (e2e)".

Context found while reading the repo (informs the ACs; not a design):
- CI is `.github/workflows/ci.yml` with two jobs: `test` (Python matrix 3.10-3.13) and `web`
  (`ubuntu-latest`, `working-directory: web`, `actions/setup-node@v4` with `node-version: lts/*` and
  npm cache on `web/package-lock.json`, then `npm ci`, lint, format:check, typecheck, test, build).
  It triggers on push to `main` and on pull requests.
- `web/package.json` has no Playwright dependency; `@playwright/test` is not installed. Scripts:
  `build` = `tsc -b && vite build`, `preview` = `vite preview`, `test` = `vitest run`, `lint` =
  `oxlint`, `typecheck` = `tsc -b --noEmit`. The root `package.json` forwards scripts to `web/`.
- Vitest uses its default `include` (`**/*.{test,spec}.?(c|m)[jt]s?(x)`) with no `exclude`, so a
  `*.spec.ts` file under `web/e2e/` would be collected by `npm test` unless excluded.
- `tsc -b` only covers `tsconfig.app.json` (`include: ["src"]`) and `tsconfig.node.json`
  (`include: ["vite.config.ts"]`); a new `web/e2e/` folder and `web/playwright.config.ts` are not
  type-checked today. oxlint runs over the whole `web/` folder with the `vitest` plugin enabled.
- `web/.gitignore` and `web/.prettierignore` do not list Playwright output folders.
- Earlier browser QA (T07-T18) drove a cached Playwright Chromium (revision 1248) through
  `playwright-core` scratch scripts, because the Playwright MCP could not find Chrome. The app runs
  fully in the browser on mock data (no Python backend needed).
- Relevant observable behaviour: at 8 selected the Add card is not rendered and unselected popover
  options are disabled; the Add card text shows "N of 8 slots open"; `setKind` (Players/Teams switch)
  clears the search query and resets the position filter to all and closes the popover; the season
  select is labelled "Season"; the 3D chart is a region labelled "3D chart" with a "Reset view"
  button; roster headers carry `aria-sort`.

## Goal

Add a committed Playwright end-to-end suite that exercises the main StatPakd user flows against the
production build at a phone width (375px) and a desktop width (1280px). Run it in GitHub Actions as
its own CI job that installs the browser and uploads traces when a test fails.

## Acceptance criteria

Tooling and configuration

- AC1: `@playwright/test` is a `devDependency` in `web/package.json` (lockfile updated); no runtime
  dependency is added. `playwright-core` is not added separately.
- AC2: `web/playwright.config.ts` exists and defines: `testDir` `./e2e`; a `webServer` that serves
  the production build with `vite preview` (building first) on a fixed host and port
  (`127.0.0.1:4173`, `--strictPort`), with `baseURL` pointing at it and `reuseExistingServer` only
  when not in CI; two projects named for their widths (e.g. `mobile-375` with viewport 375x667 and
  `desktop-1280` with viewport 1280x800), both Chromium; `trace: 'retain-on-failure'`; test output
  under `web/test-results/`; `forbidOnly` in CI.
- AC3: `npm run test:e2e` in `web/` runs `playwright test` and, from a clean checkout with the
  browser installed, builds and serves the app and runs every e2e test in both projects. The root
  `package.json` gains a forwarding `test:e2e` script like the existing ones.
- AC4: `npm test` (Vitest) does not collect any file under `web/e2e/`; its test count is unchanged
  from before T19 apart from any tests deliberately added for T19.
- AC5: `web/e2e/**/*.ts` and `web/playwright.config.ts` are type-checked by `npm run typecheck`
  (and therefore by `npm run build`), linted by `npm run lint` with zero errors, and formatted by
  `npm run format:check`. Lint rules for `web/src` are not weakened to achieve this.
- AC6: Playwright output folders (`test-results/`, `playwright-report/`, `blob-report/`,
  `playwright/.cache/`) are ignored in `web/.gitignore` and `web/.prettierignore`; after a run
  `git status` shows no new untracked output files.

Test quality

- AC7: Each test title states a user-visible behaviour (e.g. "adding entities stops at 8 and
  removing one reopens a slot"), not an implementation detail or a ticket/AC number only.
- AC8: No fixed sleeps: `web/e2e/` contains no `waitForTimeout`, `setTimeout`, or `sleep` calls.
  Waiting is done with Playwright's auto-waiting locators and web-first assertions (`expect(locator)`
  matchers), and elements are located by role, label or text (accessible locators), with test ids or
  CSS selectors only where no accessible locator exists (each such case commented).
- AC9: Reliability: `npx playwright test --repeat-each=3 --retries=0` passes with zero failures and
  zero flaky results locally across both projects. The config uses `retries: 0` locally and at most
  1 in CI. Tests are independent (each starts from a fresh page at `/`) and can run in parallel.

Flows covered (each runs in both the 375px and 1280px projects)

- AC10 (entities up to 8): on Players, starting from the default selection, the user adds entities
  through the Add popover until 8 are selected; then the Add card is gone (or the popover shows the
  remaining options disabled), the card list shows 8 entity cards, and an unselected option cannot be
  added. Removing one entity with its card remove button leaves 7 cards and the Add card returns
  showing "1 of 8 slots open". Removing an entity from inside the popover also reduces the count.
- AC11 (change stats): unchecking a selected stat in the sidebar removes that stat's row from the
  compare table; adding a stat through an "Add stat" menu adds its row; re-checking restores it.
  The last remaining stat in a group cannot be removed is not required to be covered here.
- AC12 (chart tabs): switching tabs Table, Bars, Radar and 3D each shows that view (the compare table;
  the bars with each selected entity's name; the radar chart; the 3D chart region) and hides the
  previous one; the selected tab has `aria-selected="true"`.
- AC13 (3D drag): on the 3D tab, dragging with the mouse across the "3D chart" region (pointer down,
  move, up) changes the projected position of at least one plotted point (its rendered coordinates
  or bounding box differ from before), and clicking "Reset view" returns the points to their initial
  positions.
- AC14 (Teams breakdown and sorting): switching to Teams and to Team breakdown shows the team chips,
  header card, share of production and roster table; picking a different team chip updates the header
  card's team name; toggling Offense/Defense changes the roster columns; clicking a roster column
  header sets its `aria-sort` to "descending" and the rows are in descending order of that column's
  values, clicking again sets "ascending" with rows in ascending order (null/"—" values last in both).
- AC15 (season switch): changing the "Season" select to the other season updates its selected value
  and changes at least one displayed stat value in the compare table (mock data differs by season);
  switching back restores the original value.
- AC16 (Players/Teams switch resets filter): on Players, open the Add popover, type a search query
  and pick a position chip so the result list is filtered; switch to Teams and back to Players; on
  reopening the popover the search box is empty, the "all positions" chip is the selected one, and
  the unfiltered results are shown. Also, the popover is closed after the switch.
- AC17 (no horizontal page scroll): in the `mobile-375` project, at the end of the AC12 and AC14
  flows, `document.documentElement.scrollWidth <= clientWidth`.

CI

- AC18: `.github/workflows/ci.yml` gains a separate job `e2e` (existing `test` and `web` jobs
  unchanged) on `ubuntu-latest` with `working-directory: web`, `actions/checkout@v4`,
  `actions/setup-node@v4` (`lts/*`, npm cache on `web/package-lock.json`), `npm ci`,
  `npx playwright install --with-deps chromium`, then `npm run test:e2e`. It runs on the same
  triggers as the other jobs.
- AC19: On failure the job uploads traces with `actions/upload-artifact@v4` under
  `if: ${{ failure() }}` (or `!cancelled()` restricted to failure output), uploading
  `web/test-results/` (which contains `trace.zip` files) and the HTML report if generated, with a
  bounded `retention-days` (e.g. 7). The CI reporter includes `github` so failures annotate the run.
- AC20: CI cannot be run from this environment, so "CI job green" is satisfied by: (a) running the
  same commands as the job locally in `web/` (`npm ci`, browser install or the cached Chromium,
  `npm run test:e2e`) with all tests passing; (b) the workflow file parsing as valid YAML with a
  YAML parser, and its `e2e` job containing every step listed in AC18/AC19 (checked by reading the
  file; `actionlint` if available); and (c) a deliberately failing temporary test producing a
  `trace.zip` under `web/test-results/` with the configured trace setting, after which the temporary
  test is removed. Results of (a)-(c) are recorded in the QA report for T19.

Regressions and checks

- AC21: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test` and `npm run build`
  pass in `web/`; no existing test is deleted or weakened; no component or source file under
  `web/src/` changes behaviour (any `web/src` change needed for testability is limited to accessible
  names or attributes and is listed in the plan).
- AC22: Python checks (`ruff check .`, `pytest`) are unaffected and still pass.

## Out of scope

- Firefox and WebKit projects, mobile device emulation beyond viewport size (`isMobile`, touch
  events), and a 768px project.
- Visual regression / screenshot comparison tests and axe checks in e2e (T18 covers axe in Vitest
  and QA; T20 covers visual fidelity).
- Keyboard-only flows in e2e (covered by T18 component tests), 3D keyboard rotation, axis select
  changes, share-segment tooltips.
- Testing against the Vite dev server, against the Python API, or with real data (T22/T23).
- Changing app behaviour or UI to suit tests, beyond adding missing accessible names (AC21).
- Running CI on the `autobuild` or ticket branches (triggers stay as they are), caching Playwright
  browsers in CI, sharding, and merge/blob reports.
- Editing `CLAUDE.md` to list the new command (see open question 1).

## Assumptions

No human input was requested (unattended autobuild). Numbering below is local to T19. Each default
follows CLAUDE.md, `docs/plan.md`, the existing CI and how earlier QA ran Playwright.

- B1 (runner): `@playwright/test` is the standard Playwright runner and matches `docs/plan.md`;
  earlier QA used `playwright-core` only because the MCP could not find Chrome, which does not
  affect a committed suite. Only Chromium is used (the only browser QA has had, and the cheapest CI
  install).
- B2 (local browser): the `@playwright/test` version is chosen so its Chromium revision matches the
  cached Chromium 1248 if such a version is within the current major range, so local runs need no
  download; otherwise `npx playwright install chromium` is run once locally. The planner records
  which applies. No system Chrome channel is used.
- B3 (built app): "against the built app" means `vite build` then `vite preview`, not the dev
  server. The webServer command builds before previewing so `npm run test:e2e` works on its own;
  the CI `e2e` job therefore builds once inside the webServer step and does not depend on the `web`
  job's build.
- B4 (host and port): `127.0.0.1:4173` (Vite preview's default port) with `--strictPort`, avoiding
  `localhost` IPv6 resolution issues on Windows and Node 18+.
- B5 (widths): projects at 375x667 and 1280x800, the same sizes as T18's checked widths.
- B6 (test location and naming): tests live in `web/e2e/` as `*.spec.ts`; Vitest excludes
  `e2e/**` explicitly (rather than relying on a different suffix), so the folder is the boundary.
  A dedicated tsconfig for e2e and the Playwright config (referenced from `web/tsconfig.json`) is
  the expected way to type-check them; the planner may choose another way that meets AC5.
- B7 (lint): oxlint's `vitest` plugin may misfire on Playwright's `test`/`expect`; if so, an
  override scoped to `e2e/**` (and `playwright.config.ts`) adjusts only those rules for those files.
- B8 (league names in e2e): the CLAUDE.md rule "no league-specific names in components" applies to
  components; e2e tests drive the real app with mock NFL data and may use visible labels such as
  stat names, team or player names. They should prefer roles and structural assertions and read
  names from the page where possible, so they survive mock data changes. `noLeagueLiterals` tests do
  not scan `web/e2e/`.
- B9 (flows): all ticket flows are covered (AC10-AC16), each in both projects. "Players/Teams switch
  resets filter" is read as the reducer's `setKind` behaviour (search query cleared, position filter
  reset to all, popover closed). "Change stats" means sidebar checkboxes and the Add stat menu.
- B10 (CI shape): a separate `e2e` job in the existing `ci.yml` (not a new workflow file) so all
  checks stay in one workflow with the same triggers and concurrency group; it runs in parallel with
  the `web` job. Browsers are installed with `--with-deps chromium` on every run (no cache), which is
  Playwright's recommended approach.
- B11 (traces): `trace: 'retain-on-failure'` gives a trace for every failing test whether or not it
  is retried; CI `retries: 1` lets a one-off infrastructure blip pass while the local
  `--repeat-each=3 --retries=0` check (AC9) guards against real flakiness. Reporter: `list` locally;
  `github` plus `html` (`open: 'never'`) in CI.
- B12 (verification without CI): per the caller, AC20 replaces an actual green CI run. The T19 QA
  report goes in `docs/qa/T19-report.md` like earlier tickets.
- B13 (3D drag observable): the drag is verified through plotted point positions (rendered SVG
  coordinates or bounding boxes), the only user-visible effect of rotation; no camera values are
  read from app internals.

## Open questions

None blocking. Non-blocking, for the human to confirm later:
1. Should `CLAUDE.md` "Web commands" list `npm run test:e2e` (and the one-time
   `npx playwright install chromium`)? Agents may not edit `CLAUDE.md`, so this is left to the human.
2. Should CI also run on the `autobuild` branch (push), so unattended runs get CI feedback (B10 keeps
   the current triggers)?
3. Add Firefox/WebKit or a 768px project later, or keep e2e Chromium-only at two widths (B1/B5)?
