# T10 requirements: Compare panel, tabs and Table view

Source ticket: `docs/tickets/T10-compare-panel-and-table.md` (its acceptance criteria are the contract).
References: handoff `design_handoff_statpakd/README.md` section 4 "Body" / "Main panel" / "Table",
"Interactions & Behavior" (responsive wrap, tables scroll horizontally), "State Management"
(`view`, `chart2`, `sel`, `stats`); design markup `design_handoff_statpakd/design/StatPakd App.dc.html`
lines 73-97 (main panel, tabs, Bars | Radar control, empty state, table, caption) and script lines
373-379 (`rows`, best value), 418-419 (`colName` / `colMeta` switch above 4 entities), 445
(`tableMinW`), 462-468 (`tabs`, `chart2Tabs`, `isNum`, `gridCols`).
Merged building blocks: `web/src/components/ui/` (`Tabs`, `TabPanel`, `tabId` / `panelId`,
`SegmentedControl`, `Pill`), `web/src/styles/` (tokens, `seriesColor`), `web/src/lib/stats.ts`
(`formatStat`, `bestIndex`, `NULL_PLACEHOLDER`), `web/src/state/` (`view`, `chart2`, `sel`, `stats`,
`kind`, `season`; actions `setView`, `setChart2`; `canonicalStatOrder`),
`web/src/components/picker/useEntities.ts`, `web/src/components/picker/filterEntities.ts`
(`kindSingular`), `web/src/components/sidebar/useStatDefs.ts`, `web/src/App.tsx`.

## Goal

Fill the empty "Stat views" region beside the stat sidebar with the Compare main panel: underline
tabs "Table" / "2D chart" / "3D chart", a Bars | Radar control while 2D is active, placeholder areas
for the charts (delivered in T11, T12, T14) and an empty state when nothing is selected. The Table
tab shows a real, accessible `<table>` comparing the selected entities of the current kind on the
selected stats, with best-value pills, "—" for not-applicable values and horizontal scrolling instead
of squashing, operable by keyboard alone at 375px and 1280px.

## Design values to match (from the handoff and design markup)

- Main panel: `flex: 1 1 560px; min-width: 0`, flex column, gap 16px (existing `.panel` sizing in
  `App.module.css` stays).
- Tab row: flex, `align-items: flex-end`, `justify-content: space-between`, bottom border
  `1px #E8E8E5`, gap 16px, wraps. Tabs gap 24px, 14px / 600, padding `0 0 10px`, active `#111` with
  2px `#111` bottom border, inactive `#8A8A85` with transparent border (the merged `Tabs` primitive).
- Bars | Radar control (only when 2D active), right side of the tab row: track `#F2F2EF`, radius 7,
  padding 2, margin-bottom 8; items 12px / 600, padding `4px 12px`, radius 5; active white + shadow
  `0 1px 2px rgba(0,0,0,.1)` and `#111` text; inactive muted text. (Smaller than the default
  `SegmentedControl` light variant.)
- Empty state: padding `60px 20px`, centered, `#7A7A75` 14px, border `1px dashed #DADAD6`, radius 12.
  Text "Add a player to start comparing." (Players) / "Add a team to start comparing." (Teams).
- Table wrapper: border `1px #E6E6E3`, radius 12, `overflow-x: auto`; inner min-width
  `190 + 130 * n` px (n = number of entity columns).
- Column template for header and every row: `minmax(170px,1.3fr) repeat(n, minmax(0,1fr))`.
- Header row: bg `#FAFAF8`, bottom border `1px #E6E6E3`. First cell "Stat": 11px / 600 uppercase,
  letter-spacing .08em, `#7A7A75`, padding `14px 18px`, bottom-aligned. Entity cells: padding
  `14px 18px`, right-aligned column; line 1 = 8px round dot in series color + name, 14px / 600,
  nowrap, gap 8; line 2 = meta, 12px `#7A7A75`, nowrap.
- Body rows: bottom border `1px #F0F0ED`, vertically centered. Row header: padding `12px 18px`,
  14px label, then "lower is better" note 11px `#9A9A95` (baseline-aligned, gap 8, wraps). Value
  cells: padding `9px 18px`, right-aligned; value Geist Mono 17px / 500, padding `3px 9px`, radius 6.
  Best = `Pill` (`#111` bg, white text). N/A = "—" in `#B5B5B0`. Other values `#111`.
- Caption below the table, gap 10 from it: 12px `#7A7A75`,
  "Black = best among selected · — = not applicable to position".

## Acceptance criteria

### Layout and App integration

- AC1: The `<section>` with accessible name "Stat views" (role `region`) still exists inside `main`,
  follows the "Stats" sidebar in DOM order, and now contains the compare panel (tab list first).
  No second element named "Stat views" exists.
- AC2: At viewport widths where the body row fits (for example 1280px) the panel sits to the right
  of the 232px sidebar; at 375px the panel wraps below the sidebar and spans the content width.
- AC3: App.sidebar.test.tsx keeps passing with exactly one deliberate change: in test
  "AC22: the Stats sidebar and the empty Stat views region are inside main" the assertion
  `expect(panel).toBeEmptyDOMElement()` is replaced by an assertion that the region contains the
  view tab list (and the test title drops "empty"). Every other test in that file and every other
  existing test (App.test, App.nav.test, App.picker.test, picker, sidebar, state, ui, data, lib) is
  unchanged and passes.

### Tabs and Bars | Radar control

- AC4: The panel shows a tab list (accessible name "View") with tabs "Table", "2D chart",
  "3D chart" in that order, mapped to state `view` values `num`, `2d`, `3d`. The tab matching
  `state.view` has `aria-selected="true"`; on first load (state default `view: '3d'`) "3D chart" is
  selected.
- AC5: Clicking a tab dispatches `setView` and shows that tab's panel. With the keyboard, Tab moves
  focus onto the selected tab only (roving tabindex); ArrowRight / ArrowLeft (wrapping), Home and
  End move focus and selection; the newly selected tab's panel is shown.
- AC6: Every tab's `aria-controls` points to an element that exists in the DOM with role `tabpanel`
  and `aria-labelledby` pointing back to the tab. Only the selected tab's panel is visible; the
  others are hidden from both sight and the accessibility tree.
- AC7: While "2D chart" is selected, a control labelled "Chart type" with buttons "Bars" and "Radar"
  appears at the right of the tab row; the button matching `state.chart2` has `aria-pressed="true"`.
  Clicking (or Enter / Space on) the other button dispatches `setChart2`. The control is absent when
  "Table" or "3D chart" is selected. At 375px it wraps under the tabs rather than overflowing.
- AC8: The 2D panel shows a placeholder area for the active chart type whose visible text names it
  ("Bars chart" or "Radar chart") and says it is coming soon; switching Bars / Radar switches the
  placeholder. The 3D panel shows a "3D chart" coming-soon placeholder. Placeholders contain no
  interactive elements and no league-specific text.

### Selected entities and stats

- AC9: The panel shows the entities in `state.sel[state.kind]` in selection order, resolved from the
  entities of the active league, current kind and current season (same source as the picker). The
  n-th selected entity uses `seriesColor(n)` where n is its index in `sel`, matching the top border
  of its picker card. Ids not found in the loaded entities are skipped (no column), without changing
  the colour of the others.
- AC10: Table rows are the stats in `state.stats[state.kind]` that have a definition for the current
  kind, in canonical order (`canonicalStatOrder` of the kind's stat definitions), labelled with
  `StatDef.label`. Adding a stat in the sidebar adds its row in canonical position; removing one
  removes its row.
- AC11: Switching Players / Teams shows the other kind's selected entities and stats; changing the
  season shows the values for the new season. Both happen without a page reload.

### Table content (Players and Teams)

- AC12: Players kind, default state: one column per default selected player (3), headed by the
  entity's full `name` and its `meta` line, and one row per default selected player stat (6) in
  sidebar order. Teams kind, default state: one column per default selected team (3) with full
  `name` and `meta` (division and record), and one row per default team stat (6). Structure, styles
  and caption are identical for both kinds; only the data differs.
- AC13: Each value cell shows `formatStat(value, def)` (decimals, thousands separators, "+" for
  positive values of `signed` stats).
- AC14: A null or missing value shows the visible glyph "—" (U+2014) in the muted colour, never a
  pill, and exposes "not applicable" to assistive technology (for example visually hidden text).
- AC15: In each row, every cell whose index is in `bestIndex(values, def)` shows its value inside
  the `Pill` primitive and exposes "best" to assistive technology; all other cells show plain text.
  Consequences that must hold: lower-is-better rows pill the smallest value; ties pill every tied
  cell; N/A values are ignored; a row with fewer than 2 non-null values (including a single selected
  entity) shows no pill.
- AC16: Rows of stats with `lowerIsBetter` show the note "lower is better" after the label inside
  the row header; other rows show no note. (The Teams defaults include such a stat; for Players it
  appears after adding one from the sidebar.)
- AC17: With 1 to 4 entities, each header cell shows the entity's full `name` and `meta`. With 5 to
  8 entities, each header shows `shortName` and, as the second line, `badge` (see Assumption A4).
  Adding the 5th entity switches every header; removing back to 4 switches them back.
- AC18: The visible caption "Black = best among selected · — = not applicable to position" appears
  below the table whenever the table is shown.

### Table semantics and scroll accessibility

- AC19: The Table view is a real `<table>` with an accessible name (Assumption A7). It has one
  header row of `<th scope="col">` cells: "Stat" then one per entity (name text included); each body
  row starts with a `<th scope="row">` holding the stat label (and note) followed by one `<td>` per
  entity. `getByRole('table')`, `columnheader`, `rowheader` and `cell` queries find them, and the
  table, row, header and cell roles survive the CSS used for the grid layout (checked in a browser
  accessibility tree, not only jsdom).
- AC20: The table sits in a scroll container that is a named, keyboard-focusable region (role
  `region`, accessible name "Comparison table", `tabindex="0"`) with a visible focus indicator. When
  focused, ArrowLeft / ArrowRight scroll it horizontally.
- AC21: The column template is `minmax(170px,1.3fr) repeat(n, minmax(0,1fr))` and the table's
  min-width is `190 + 130 * n` px (580px at n = 3, 1230px at n = 8). Entity columns are equal width.

### Empty state

- AC22: When `state.sel[state.kind]` is empty, the panel shows the empty-state box with
  "Add a player to start comparing." (Players) or "Add a team to start comparing." (Teams) below the
  tab row, on every tab, and no table and no caption are rendered. The tab list and (on 2D) the
  Bars | Radar control remain usable. On the 3D tab the 3D placeholder may still appear below the
  message (the design plots all league entities in 3D).
- AC23: While the selection is non-empty but entities have not loaded yet, the empty-state message
  is not shown.

### Browser checks (375px and 1280px)

- AC24: At 1280px with the 3 default players on the Table tab, the table fits the panel without a
  horizontal scrollbar and columns are not squashed below their minimums.
- AC25: At 1280px and at 375px with 8 entities selected on the Table tab, the table keeps
  min-width 1230px and scrolls horizontally inside its bordered container; the page itself does not
  scroll horizontally because of the panel, and the last entity column can be reached by scrolling
  (mouse, touch or keyboard).
- AC26: At 375px with the default 3 entities, the table (580px min-width) also scrolls inside its
  container instead of squashing; values and the best pill stay on one line.
- AC27: Keyboard only, from the page start: Tab reaches the view tab list after the sidebar
  controls, arrows switch views, Tab from the tab list reaches the Bars | Radar buttons (2D only)
  and then the table scroll region (Table only); focus is always visible; nothing in the panel is a
  keyboard trap.

### Code rules and tests

- AC28: The new panel and table source files contain no league-specific literals (league ids, stat
  keys, groups, labels, positions, team ids); a `noLeagueLiterals.test.ts` for the new component
  folder, in the style of the picker and sidebar ones, enforces this. Data is obtained only through
  the DataSource context / existing hooks (no imports from `data/` or of `MockProvider`).
- AC29: Component tests (Vitest + Testing Library, using the test fixture provider) cover at least:
  best pill (including lower-is-better and ties), N/A "—" excluded from best, single-entity row has
  no pill, many entities (8 columns, short-name / badge headers, min-width 1230px), header switch at
  the 4/5 boundary, empty state for both kinds, tab switching by click and keyboard, Bars | Radar
  visibility and toggle, table roles (column and row headers), focusable scroll region.
- AC30: `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass.

## Out of scope

- Real Bars chart (T11), Radar chart and its "Pick at least 3 stats" message (T12), 3D math and
  chart, axis selects, readout and camera (T13, T14).
- Team breakdown mode (T15 to T17) and the "Compare teams" | "Team breakdown" control. Behaviour of
  the panel when `teamMode` is `inside` is not designed here (Assumption A9).
- Sorting, column reordering or removing entities from the table.
- Changes to the domain types, DataProvider interface, MockProvider data or the state reducer
  (including the default `view`).
- Contrast fixes for `#9A9A95` / `#B5B5B0`, touch-target sizing and axe audit (T18). The design
  colours are used as given.
- Playwright end-to-end tests (T19); browser checks above are manual or via existing tooling.

## Assumptions

- A1: Data access reuses the existing hooks as they are: `useEntities(kind, season)` from
  `components/picker/useEntities.ts` and `useStatDefs(kind)` from
  `components/sidebar/useStatDefs.ts`. Moving them to a shared folder is not done, because the
  sidebar's `noLeagueLiterals.test.ts` imports `./useStatDefs.ts?raw` and asserts it contains
  `useDataProvider` (a re-export stub would fail it) and the hooks' own tests import them by path.
  Exporting them additionally from the folders' `index.ts` is allowed. Each consumer issues its own
  provider request; with the MockProvider this duplicate fetch is acceptable.
- A2: Canonical order is derived from the kind's stat definitions with `canonicalStatOrder`, so the
  table order matches the sidebar even if `state.stats` were not already sorted.
- A3: The colour index is the position in `state.sel[kind]` (as in `EntityPicker`), so table, cards
  and future charts agree.
- A4: The handoff asks for "short name & jersey" above 4 entities, but the domain `Entity` has no
  jersey field; `badge` is the position for players and the abbreviation for teams, and the UI must
  not parse `meta`. The compact header therefore shows `shortName` + `badge`. Adding a jersey field
  would change the domain and provider (out of scope); see open question Q1.
- A5: Empty state follows the design: shown when `sel[kind]` is empty, under the tab row, on every
  tab; the 3D placeholder may still render below it. Text uses `kindSingular(kind)`.
- A6: The default view stays `3d` (state default from the design), so the app opens on the 3D
  placeholder; tests select "Table" explicitly.
- A7: Table accessible name: "Selected players compared by stat" / "Selected teams compared by stat"
  (via `<caption>` or `aria-label`; the visible design caption may be the `<caption>` or a separate
  note, as long as the visible text and position match the design).
- A8: Tab list label "View"; Bars | Radar control label "Chart type"; scroll region label
  "Comparison table". Placeholder text "<chart name> — coming soon". These strings are generic, not
  league-specific.
- A9: When `kind` is `teams` and `teamMode` is `inside` (unreachable from the UI today), the panel
  renders as for compare mode; T15 will define the breakdown layout.
- A10: Hidden tab panels are kept in the DOM (hidden) so that `aria-controls` always resolves;
  their content may be empty while hidden.
- A11: The caption text including "to position" is used for both kinds, exactly as in the design.
- A12: The smaller Bars | Radar control may be done by adding a size option to `SegmentedControl`
  or by local styles, provided existing ui tests are unchanged and pass.

## Open questions

Nothing blocks the work; the defaults above apply unless the human decides otherwise.

1. Q1 (affects AC17): should the compact (more than 4 entities) header show the jersey number as the
   handoff says? That needs a new optional domain field (for example `Entity.number`) provided by the
   data layer. Default for now: show `badge` (position for players, abbreviation for teams).
2. Q2: should the app open on the Table tab instead of the design's default 3D chart, given that
   3D is only a placeholder until T14? Default: keep `3d`.
3. Q3: for Teams, "not applicable to position" in the caption reads oddly. Should it be
   kind-neutral ("not applicable") or vary by kind? Default: design text for both.
4. Q4: should the empty state hide the 3D placeholder too? Default: follow the design (3D still
   shows).
