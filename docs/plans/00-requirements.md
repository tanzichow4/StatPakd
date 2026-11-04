# T11 requirements: 2D Bars chart

Source ticket: `docs/tickets/T11-bars-chart.md` (its acceptance criteria are the contract).
References: handoff `design_handoff_statpakd/README.md` section "Main panel" / "2D Bars" and
"Interactions & Behavior" (normalization uses the full league pool range for the current season,
ignoring nulls; responsive); design markup `design_handoff_statpakd/design/StatPakd App.dc.html`
lines 99-103 (Bars markup and caption) and script lines 360-365 (`poolAll`, `range`, `fmt`, `n01`),
366 (series colour by selection index) and 380-382 (`bars`: width
`Math.round((0.05 + 0.95 * n01) * 100)%`, 0 for null, name = short name, no inversion).
Merged building blocks: `web/src/lib/stats.ts` (`leagueRange`, `normalize`, `barWidth`,
`formatStat`, `NULL_PLACEHOLDER`), `web/src/components/compare/` (`ComparePanel`, `tableModel`
`resolveColumns` / `resolveRows`, `ChartPlaceholder`, `EmptyState`), `web/src/styles/`
(`seriesColor`, tokens), hooks `useEntities` / `useStatDefs`.

## Goal

Replace the "Bars chart — coming soon" placeholder on the 2D tab (Bars selected) with the real
2D Bars chart: one row per selected stat, and inside it one labelled horizontal bar per selected
entity whose length is scaled to the full league pool range for the current kind and season. The
chart follows the design exactly (no inversion for lower-is-better stats), shows "—" and no bar for
not-applicable values, and exposes every bar's entity name and value as text.

## Design values to match (from the design markup, lines 99-103)

- Chart container: flex column. Caption below the last row: "Bar length scaled to league range.",
  12px `#7A7A75`, padding-top 10px.
- Stat row: grid `160px minmax(0,1fr)`, gap 20px, padding `14px 0`, bottom border `1px #F0F0ED`,
  items vertically centred.
- Row header (left cell): flex column, gap 2px; label 14px / 500; below it the note
  "lower is better" 11px `#9A9A95` for `lowerIsBetter` stats (nothing visible otherwise).
- Bars cell (right cell): flex column, gap 6px; one line per entity: flex, items centred, gap 12px.
  - Name column: width 110px, no shrink, flex with gap 6px, 12px / 600, nowrap, overflow hidden,
    text-overflow ellipsis; an 8x8px square (radius 2px) in the entity's series colour, then
    the entity's `shortName`.
  - Track: `flex: 1; min-width: 0`, height 16px, background `#F3F3F0`, radius 3px, overflow hidden.
  - Fill: full height, radius 3px, background = series colour, width = `barWidth(value, range)%`.
  - Value: width 70px, right-aligned, Geist Mono 13px, text = `formatStat(value, def)`.

## Acceptance criteria

### Placement and switching

- AC1: With "2D chart" selected, Bars active (`state.chart2 === 'bars'`), a non-empty selection
  and loaded data, the 2D tab panel shows the Bars chart and no "Bars chart — coming soon" text.
- AC2: Clicking "Radar" in the Chart type control replaces the Bars chart with the existing
  "Radar chart — coming soon" placeholder (Radar is T12); clicking "Bars" brings the chart back.
- AC3: The Table and 3D tabs behave exactly as before T11. The empty state (no selection) and the
  loading state (selection non-empty, data pending: nothing below the tab row except the Chart type
  control) on the 2D tab behave exactly as before T11; no bars, rows or caption render in either.

### Rows and lines

- AC4: The chart has one stat row per row of the Table view (`resolveRows`: selected stats with a
  definition for the current kind, in canonical order), each headed by `StatDef.label`.
- AC5: Rows of `lowerIsBetter` stats show the note "lower is better" under the label; other rows
  show no note text.
- AC6: Inside each stat row there is one line per resolved column (`resolveColumns`: selected
  entities in selection order, unknown ids skipped). Each line shows the series-colour square for
  the entity's selection index (`seriesColor(colorIndex)`, the same colour as the picker card and
  table dot), the entity's `shortName`, the bar track and the formatted value.
- AC7: The value text is `formatStat(value, def)` (same decimals, thousands separators and "+"
  for `signed` stats as the Table).
- AC8: The caption "Bar length scaled to league range." appears once, below the last stat row,
  whenever the chart is shown.

### Bar width

- AC9: For a non-null value, the fill width is `barWidth(value, range)` percent, where `range` is
  `leagueRange(pool, def.key)` and `pool` is every entity returned for the active league, current
  kind and current season (the same list the picker loads, unaffected by the picker's search text
  or position filter), not only the selected entities. Consequences that must hold: the pool
  minimum gets 5%, the pool maximum gets 100%, a selected entity that is neither min nor max of the
  pool gets a width strictly between them even if it is the largest or smallest among the selection.
- AC10: When the pool range has `min === max`, every non-null value gets the width `barWidth`
  returns for normalized 0.5 (about 52-53%).
- AC11: Bars are never inverted: for a `lowerIsBetter` stat the larger value still gets the longer
  bar.
- AC12: Changing the season or switching Players / Teams recomputes ranges from the new pool and
  updates widths and values without a page reload. Adding or removing a selected entity does not
  change the width of the other entities' bars (the range does not depend on the selection).

### Not applicable values

- AC13: A null or missing value shows the visible glyph "—" (U+2014) in the value column, in the
  muted colour used by the Table (`#B5B5B0`), and renders no fill bar (no fill element, or none with
  non-zero width). The empty track and the name column still render so lines stay aligned.
- AC14: An N/A value is exposed to assistive technology as "not applicable" (as in the Table), and
  N/A values do not affect the range (they are ignored by `leagueRange`).

### Accessibility

- AC15: The chart is a labelled group (Assumption A5). Each stat row is a labelled group or list
  whose accessible name is the stat label (plus "lower is better" when applicable). Within it, each
  entity line exposes the entity name and the formatted value (or "not applicable") as text, so a
  screen-reader user can identify stat, entity and value without colour or bar length.
- AC16: The colour square, track and fill are decorative and hidden from assistive technology;
  colour is never the only identifier (the name is always visible beside the bar).
- AC17: The chart contains no interactive elements and adds no tab stops; keyboard order from the
  tab list to the Chart type control and out of the panel is unchanged.

### Layout (375px and 1280px)

- AC18: At 1280px with the 3 default players, the chart matches the design values above: 160px
  label column, 110px name column, 16px tracks, 70px value column, and the page has no horizontal
  scroll.
- AC19: With 8 entities selected, every stat row shows 8 lines; long short names are truncated with
  an ellipsis inside the 110px column and never push the track or value out of place.
- AC20: At 375px the page does not scroll horizontally because of the chart; every track has a
  visible non-zero width and every value is fully visible (see Assumption A6 for how the row adapts).
- AC21: Structure, styles and caption are identical for Players and Teams; only the data differs.

### Code rules and tests

- AC22: New source files contain no league-specific literals and do not import from `data/` or
  `MockProvider`. They are added to `web/src/components/compare/noLeagueLiterals.test.ts` (sources
  map), which keeps its existing checks. Pool data comes through the existing `useEntities` hook
  (or entities already loaded by `ComparePanel`), not a new provider path.
- AC23: Component tests (Vitest + Testing Library, test fixture provider or explicit props) cover at
  least: width from the pool range where the selection is a strict subset of the pool and the
  selected values are not the pool min/max (asserting the exact `%` width); pool min = 5% and
  pool max = 100%; equal-range case; lower-is-better not inverted; N/A shows "—", no fill and
  "not applicable"; series colour by selection index; row order and labels; "lower is better"
  note; caption; 8-entity case; accessible name/value text per line; Bars / Radar switching in
  `ComparePanel`.
- AC24: The existing `ComparePanel.test.tsx` test "AC8: 2D shows Bars chart, then Radar chart after
  toggling" is updated deliberately: it asserts the Bars chart (not the placeholder) on 2D, then the
  Radar placeholder after toggling, and the Bars chart's absence afterwards; this is a stronger
  assertion, not a weaker one. The test "AC31: loading on 2D shows no placeholder and no empty
  message" is extended (not weakened) to also assert no bars render while loading. Every other
  existing test is unchanged and passes, including `placeholders.test.tsx` (the `ChartPlaceholder`
  component itself is kept for Radar and 3D).
- AC25: `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass.

## Out of scope

- Radar chart, its inversion of lower-is-better and the "Pick at least 3 stats" message (T12).
- 3D math and chart (T13, T14); Team breakdown and share-of-production stacked bars (T15-T17).
- Tooltips, hover states, animations or transitions on bars; sorting bars; axis ticks or gridlines.
- Showing full `name` / `meta` or a jersey number in the bars name column (design uses short name).
- Changes to `lib/stats.ts` behaviour, domain types, DataProvider, MockProvider data or reducer.
- Contrast fixes for `#9A9A95` / `#B5B5B0` and full axe audit (T18); Playwright e2e (T19).

## Assumptions

- A1 (ticket "confirm against the design script"): confirmed. The design script (line 381) computes
  `Math.round((0.05 + 0.95 * n01(k, v)) * 100)` with `n01` = plain `(v - min) / (max - min)` and no
  `low` check, so lower-is-better bars are not inverted. The existing `barWidth(value, range)` in
  `lib/stats.ts` already implements this (T05 assumption "bars never inverted") and must be used
  rather than re-implemented.
- A2: "League pool" = all entities from `useEntities(kind, season)` for the active league, matching
  the design's `poolAll` (built per kind and season, not filtered by position or search). Ranges are
  per stat key and ignore null values.
- A3: N/A: the design gives null a 0% fill and prints "—". The ticket says "no bar", so the fill is
  not rendered (or has zero width) while the empty track remains for alignment; the "—" uses the
  Table's muted N/A colour, which the design's bars markup does not specify (it uses default text
  colour) - chosen for consistency with the Table.
- A4: Name column shows `shortName` for every entity count (design `lbl = e.short`), for both kinds.
  The colour marker is an 8px square with radius 2 as in the bars markup (the Table uses a round dot).
- A5: Accessible names: chart group "Bars chart" (generic, not league-specific); N/A text
  "not applicable", the same wording as the Table. The exact ARIA pattern (group / list / text
  alternatives) is left to the planner as long as AC15-AC16 are observable.
- A6: The design has no narrow-width layout for Bars; at 375px the fixed columns (160 + 20 + 110 +
  12 + 12 + 70 px) leave little or no room for the track. Default: when the panel is too narrow,
  the stat row stacks the label above the bars (single column) so the track keeps visible width and
  the page does not scroll horizontally. This mirrors the existing wrap deviations (T07, T09) and
  can be refined in T18. Horizontal scrolling inside a container is an acceptable alternative if it
  satisfies AC20.
- A7: A single selected entity still gets a bar (width from the pool range); there is no
  "best" highlighting in the Bars chart (the design has none).
- A8: Data loading follows the T10 panel: the chart renders only when columns and rows are resolved;
  `ComparePanel` may pass its already-loaded entities as the pool, so no extra provider request is
  required.
- A9: Updating the T10 AC8 test (AC24) is a deliberate behaviour change requested by the ticket
  (placeholder replaced by the real chart), not a weakening.

## Open questions

Nothing blocks the work; the defaults above apply unless the human decides otherwise.

1. Q1 (affects AC20, A6): preferred narrow-screen behaviour for Bars: stack the label above the bars
   (default) or keep the design grid and scroll horizontally inside a container?
2. Q2 (affects AC13, A3): should the N/A "—" in bars use the muted Table colour (default) or the
   design's plain text colour?
3. Q3: should the chart's accessible name include the kind ("Bars chart of selected players")?
   Default: "Bars chart".
