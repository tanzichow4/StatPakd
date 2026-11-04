# T12 requirements: 2D Radar chart

Source ticket: `docs/tickets/T12-radar-chart.md` (its acceptance criteria are the contract).
References: handoff `design_handoff_statpakd/README.md` section "Main panel" / "2D Radar";
design markup `design_handoff_statpakd/design/StatPakd App.dc.html` lines 106-123 (Radar layout,
SVG, overlay labels, "Pick at least 3 stats" message, legend and caption) and script lines 196
(`COLORS`), 308 (`r1` = round to 1 decimal), 360-366 (`poolAll`, `range`, `n01`, series colour by
selection index) and 383-394 (`radar`: `pt`, rings, spokes, labels, polys).
Merged building blocks: `web/src/lib/stats.ts` (`leagueRange`, `normalize` with
`{ invertLowerIsBetter: true }`, `NULL_PLACEHOLDER`), `web/src/components/compare/`
(`ComparePanel`, `tableModel` `resolveColumns` / `resolveRows`, `BarsChart` / `barsModel` as the
pattern for a pure model + component, `ChartPlaceholder`, `EmptyState`), `web/src/styles/`
(`seriesColor`, tokens), hooks `useEntities` / `useStatDefs`.

## Goal

Replace the "Radar chart — coming soon" placeholder on the 2D tab (Radar selected) with the real
2D Radar chart: one axis per selected stat and one polygon per selected entity, each axis scaled to
the full league pool range with lower-is-better stats inverted so outward is always better. With
fewer than 3 stats the panel shows "Pick at least 3 stats for the radar." instead of a chart, and
not-applicable values plot at the centre and are named in the legend.

## Design values to match (markup lines 106-123, script lines 383-394)

- Container: flex row, gap 24px, items centred, wraps.
- Chart box: `position: relative; flex: 1 1 420px; max-width: 640px`. SVG `viewBox="0 0 520 420"`,
  width 100%, display block.
- Geometry: n = number of axes, centre C = (260, 210), R = 150. Point for axis i at fraction t:
  angle a = -pi/2 + i * 2pi/n; (x, y) = (260 + cos(a) * 150 * t, 210 + sin(a) * 150 * t), each
  coordinate rounded to 1 decimal. Axis 0 points straight up; axes go clockwise.
- Rings: 4 polygons at t = 0.25, 0.5, 0.75, 1 through every axis; no fill, stroke `#E6E6E2` 1px.
- Spokes: a line from C to the t = 1 point of every axis; stroke `#E6E6E2` 1px.
- Entity polygon: points at t = 0.08 + 0.92 * n for each axis (n from `normalize` with inversion),
  fill = series colour at fill-opacity 0.06, stroke = series colour 2px, stroke-linejoin round.
  One vertex dot per axis: circle r 3.5, fill series colour, stroke `#fff` 1.5px.
- Axis labels: HTML elements in an absolutely positioned overlay (`inset: 0`, pointer-events none),
  not SVG text. Each at the t = 1.12 point of its axis, as `left = x / 520 * 100%`,
  `top = y / 420 * 100%` (rounded to 1 decimal). Alignment: if |x - 260| < 8 the label is centred
  (`translate(-50%,-50%)`); if right of centre it starts at the point (`translate(0,-50%)`);
  if left it ends at the point (`translate(-100%,-50%)`). 12px / 500, colour `#333`, nowrap.
  Text = `StatDef.label`.
- Too-few-stats message: `flex: 1`, padding 60px, centred, 14px, `#7A7A75`, text
  "Pick at least 3 stats for the radar."
- Legend (right column, `flex: 0 0 200px`, column, gap 14px): per entity, a block with
  `border-left: 3px solid <series colour>`, padding-left 12px, column gap 2px: `name` 14px / 600,
  then `meta` 12px `#7A7A75`. After the entities, caption 12px `#7A7A75` line-height 1.5:
  `Axes scaled to league range; "lower is better" stats are inverted so outward is always better.`

## Acceptance criteria

### Placement and switching

- AC1: With "2D chart" selected, Radar active (`state.chart2 === 'radar'`), a non-empty selection,
  at least 3 resolved stats and loaded data, the 2D tab panel shows the Radar chart (SVG plus label
  overlay plus legend) and no "Radar chart — coming soon" text anywhere.
- AC2: Clicking "Bars" replaces the Radar chart with the T11 Bars chart; clicking "Radar" brings
  the Radar back. Only one of the two charts is in the document at a time.
- AC3: The Table and 3D tabs, the Bars chart, the empty state (no selection) and the loading state
  (selection non-empty, data pending: nothing below the tab row except the Chart type control)
  behave exactly as before T12. No radar, message, legend or caption renders while loading or
  with an empty selection.

### Fewer than 3 stats

- AC4: When fewer than 3 stats resolve (`resolveRows` length 0, 1 or 2) with a non-empty
  selection and loaded data, the panel shows the text "Pick at least 3 stats for the radar." and
  renders no radar SVG, no polygons and no axis labels.
- AC5: In that state the legend and caption are still shown (as in the design, where the legend
  column is outside the `radarOk` condition), so the selected entities stay identifiable.
- AC6: Adding a third stat replaces the message with the chart without a reload; removing stats
  back to 2 restores the message.

### Geometry (pure function)

- AC7: Vertex positions, ring points, spoke ends and label anchors are computed by a pure,
  exported function (no React, no DOM, no provider access) from: the resolved stat defs, the
  resolved columns and the pool. Its unit tests assert, with exact numbers:
  - 3 axes, t = 1: (260, 60), (389.9, 285), (130.1, 285);
  - 4 axes, t = 1: (260, 60), (410, 210), (260, 360), (110, 210);
  - pool max of a higher-is-better stat lands at t = 1 (distance 150 from C) and pool min at
    t = 0.08 (distance 12);
  - a lower-is-better stat is inverted: pool min lands at t = 1 and pool max at t = 0.08;
  - `min === max` gives t = 0.08 + 0.92 * 0.5 = 0.54;
  - rings at 0.25 / 0.5 / 0.75 / 1 and label anchors at t = 1.12 with the alignment rule above;
  - calling it twice with the same input gives equal output and does not mutate its inputs.
- AC8: Normalization uses `normalize(value, leagueRange(pool, def.key), def,
  { invertLowerIsBetter: true })` from `lib/stats.ts` (not a re-implementation), where `pool` is
  every entity returned for the active league, current kind and current season (the same list
  the picker loads, unaffected by search text or position filter). A selected entity that is
  neither pool min nor pool max gets a t strictly between 0.08 and 1 even when it is the largest
  or smallest among the selection.
- AC9: Axes follow the Table / Bars row order (`resolveRows`: canonical order, stats without a
  definition for the current kind skipped); axis i is labelled with row i's `StatDef.label`.
- AC10: There is one polygon (with one dot per axis) per resolved column, in selection order, in
  `seriesColor(colorIndex)` (same colour as the picker card, table dot and bars swatch). Later
  selections are drawn on top of earlier ones.
- AC11: Changing season or kind recomputes ranges from the new pool; adding or removing a selected
  entity does not move the other entities' vertices.

### Not applicable values

- AC12: A null or missing value plots its vertex exactly at the centre (260, 210) (Assumption A1);
  the dot is still drawn there and the polygon passes through the centre.
- AC13: Each entity's legend entry lists the stats it has no value for, as visible text
  "Not applicable: <label>, <label>" (labels in axis order) under the meta line, 12px `#7A7A75`.
  Entities with no missing values show no such line. N/A values do not affect any range.
- AC14: An entity whose values are all null renders as a degenerate polygon at the centre without
  errors (no NaN in any `points` / `cx` / `cy` attribute); the same holds when the pool range is
  null for a stat (no non-null value in the pool: t = 0.54 for non-null selected values, which
  cannot occur, and centre for nulls).

### Labels and layout

- AC15: At the default size (chart box at its 640px max width, 1280px viewport, default stats for
  Players and for Teams, and also with the longest stat label of the current kind on a left- and a
  right-pointing axis) no axis label overlaps the outer ring, spokes or polygons, and no label is
  clipped by the chart box or the panel. Verified by the geometry tests (every label anchor is
  outside R and aligned away from the centre) plus a manual visual check recorded in the QA report.
- AC16: At 375px the page does not scroll horizontally because of the radar; the legend wraps
  below the chart (flex-wrap as in the design) and the SVG scales down with its container
  (Assumption A6).
- AC17: Structure, styles, message and caption are identical for Players and Teams; only the data
  differs. With 8 entities selected, 8 polygons and 8 legend entries render.

### Accessibility

- AC18: The chart is a labelled group with the accessible name "Radar chart". The SVG and the
  label overlay are hidden from assistive technology (decorative), and an equivalent text
  alternative exposes, per entity, the entity name and each stat label with its formatted value
  (`formatStat`) or "not applicable", so the data is available without seeing the shapes.
- AC19: Colour is never the only identifier: the legend shows each entity's full name next to its
  colour bar.
- AC20: The chart, message and legend contain no interactive elements and add no tab stops;
  keyboard order from the tab list to Bars / Radar and out of the panel is unchanged.

### Code rules and tests

- AC21: New source files contain no league-specific literals and do not import from `data/` or
  `MockProvider`; they are added to `web/src/components/compare/noLeagueLiterals.test.ts`
  (sources map), which keeps its existing checks. Pool data comes from the entities already
  loaded by `ComparePanel` (`useEntities`), not a new provider path.
- AC22: Component tests (Vitest + Testing Library) cover at least: chart renders on Radar;
  0, 1, 2 stats show the message and no SVG; 3 stats show the chart; polygon count and colours by
  selection index; a vertex `points` value matching the pure function; inversion for a
  lower-is-better stat; null at centre plus the "Not applicable" legend line; legend names, meta
  and caption; accessible text alternative; Players and Teams.
- AC23: `ComparePanel.test.tsx` test "AC8: 2D shows Bars chart, then Radar chart after toggling" is
  updated deliberately to assert the real Radar chart (not the placeholder) after toggling and
  the Bars chart after toggling back; this is stronger, not weaker. The loading test on 2D is
  extended to also assert no radar renders while loading with Radar active. The `ChartPlaceholder`
  component and `placeholders.test.tsx` (which still lists "Radar chart") are kept unchanged; the
  placeholder remains used for 3D. Every other existing test is unchanged and passes.
- AC24: `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass.

## Out of scope

- 3D math and chart (T13, T14); Team breakdown (T15-T17).
- Tooltips, hover / focus highlighting of a polygon, click-to-isolate, animation, axis tick values.
- Changing the Bars chart, Table, `lib/stats.ts` behaviour, domain types, DataProvider,
  MockProvider data or the reducer (e.g. no cap on number of stats, no reordering of axes by drag).
- Avoiding label-to-label collisions for very many axes (more stats than the defaults); only
  label-to-chart overlap at the default size is in scope.
- Contrast fixes for `#7A7A75` and a full axe audit (T18); Playwright e2e (T19).

## Assumptions

- A1 (null handling): the design script maps null to n01 = 0, skips inversion, and so plots it at
  t = 0.08 (12 units from centre), indistinguishable from the pool's worst value. The ticket says
  "plot at the center", which is the contract: null vertices go to exactly (260, 210) (t = 0), and
  the 0.08 floor applies only to non-null values. `normalize` already returns 0 for null without
  inversion; the geometry function special-cases null to t = 0 instead of 0.08.
- A2 (N/A note): the ticket allows legend or tooltip; tooltips are out of scope, so the note goes
  in the legend as "Not applicable: <labels>" ("not applicable" is the Table / Bars wording). The
  design legend has no such line; style follows the meta line.
- A3 (normalization / inversion): confirmed against script line 391: t = n01, inverted (1 - t) for
  `low` stats when the value is non-null, radius fraction 0.08 + 0.92 * t. This equals
  `normalize(..., { invertLowerIsBetter: true })` (already tested against the design in
  `stats.test.ts` AC19), so it must be reused. Range = `leagueRange` over the full pool per kind
  and season (design `poolAll`), ignoring nulls; `min === max` gives 0.5; null range gives 0.5.
- A4 (axis order): the design uses selection order of `statKeys`; T10 / T11 render in canonical
  order via `resolveRows`. The radar follows `resolveRows` for consistency between views; the
  "at least 3" rule counts resolved stats, not raw keys.
- A5 (legend contents): name and meta per entity in selection order, for resolved columns only;
  the caption is the design's text verbatim. Legend and caption also show in the < 3 stats state,
  as in the design markup.
- A6 (narrow screens): the design has no narrow layout. The flex-wrap container lets the legend
  drop below the chart; the SVG scales to its container. At 375px the scaled chart leaves about
  60px left of the leftmost anchor, so long labels may extend past the box; the planner may add a
  small horizontal inset or allow labels to wrap, provided AC16 holds. Full fidelity at narrow
  widths is not required (T18 can refine).
- A7 ("default size"): the chart box at its 640px max width inside a 1280px viewport, with each
  kind's default stat selection; the longest-label check in AC15 guards against label clipping.
- A8 (accessibility): accessible name "Radar chart" (generic, not league-specific); the text
  alternative pattern (visually hidden list or table) is left to the planner as long as AC18 is
  observable with Testing Library queries.
- A9: Updating the T11 AC8 test (AC23) is a deliberate behaviour change requested by the ticket,
  not a weakening.
- A10: Coordinates are rounded to 1 decimal like the design's `r1`; tests compare exact rounded
  numbers.
- A11: A single selected entity still gets a polygon; there is no "best" highlighting in the radar.
- A12 (autobuild, Q5): with zero stats selected ComparePanel keeps rendering nothing, so the radar's fewer-than-3 message is only reachable with 1-2 stats.

## Open questions

Nothing blocks the work; the defaults above apply unless the human decides otherwise.

1. Q1 (A1, AC12): plot nulls exactly at the centre (default, per the ticket) or at the design's
   0.08 floor, relying on the legend note alone?
2. Q2 (A2, AC13): is the legend line "Not applicable: <labels>" acceptable wording, or should it be
   shorter (e.g. "N/A: <labels>")?
3. Q3 (A4, AC9): axes in canonical order (default, matches Table and Bars) or in the order stats
   were picked (design script)?
4. Q4 (A6, AC16): at 375px, inset the chart so long labels fit, or let labels wrap?
