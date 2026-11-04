# Plan: T12 2D Radar chart

Source: `docs/tickets/T12-radar-chart.md`, requirements `docs/plans/00-requirements.md` (the
contract: AC1 to AC24, assumptions A1 to A11). Run non-interactively: the defaults for Q1 to Q4
apply (nulls exactly at the centre, "Not applicable: ..." legend wording, canonical axis order,
labels wrap at narrow widths).

## 1. Goal and out of scope

Goal: replace the "Radar chart — coming soon" placeholder on the 2D tab (Radar selected) with the
real 2D Radar chart: one axis per resolved stat, one polygon per selected entity, each axis scaled
to the full league pool range with lower-is-better stats inverted so outward is always better.
With fewer than 3 stats the panel shows "Pick at least 3 stats for the radar." instead of the
chart, and not-applicable values plot at the centre and are named in the legend.

Out of scope: 3D (T13, T14); Team breakdown (T15 to T17); tooltips, hover / focus highlighting,
click-to-isolate, animation, axis tick values; any change to the Bars chart, Table, `lib/stats.ts`
behaviour, domain types, DataProvider, MockProvider data or the reducer (no stat cap, no axis
reordering); label-to-label collision avoidance for many axes; contrast fixes for `#7A7A75` and
axe audit (T18); Playwright e2e (T19).

## 2. Acceptance criteria (copied from 00-requirements.md, same numbers)

Placement and switching
- AC1: With "2D chart" selected, Radar active (`state.chart2 === 'radar'`), a non-empty selection,
  at least 3 resolved stats and loaded data, the 2D tab panel shows the Radar chart (SVG plus label
  overlay plus legend) and no "Radar chart — coming soon" text anywhere.
- AC2: Clicking "Bars" replaces the Radar chart with the T11 Bars chart; clicking "Radar" brings
  the Radar back. Only one of the two charts is in the document at a time.
- AC3: The Table and 3D tabs, the Bars chart, the empty state (no selection) and the loading state
  (selection non-empty, data pending: nothing below the tab row except the Chart type control)
  behave exactly as before T12. No radar, message, legend or caption renders while loading or
  with an empty selection.

Fewer than 3 stats
- AC4: When fewer than 3 stats resolve (`resolveRows` length 0, 1 or 2) with a non-empty
  selection and loaded data, the panel shows the text "Pick at least 3 stats for the radar." and
  renders no radar SVG, no polygons and no axis labels.
- AC5: In that state the legend and caption are still shown (as in the design, where the legend
  column is outside the `radarOk` condition), so the selected entities stay identifiable.
- AC6: Adding a third stat replaces the message with the chart without a reload; removing stats
  back to 2 restores the message.

Geometry (pure function)
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

Not applicable values
- AC12: A null or missing value plots its vertex exactly at the centre (260, 210) (Assumption A1);
  the dot is still drawn there and the polygon passes through the centre.
- AC13: Each entity's legend entry lists the stats it has no value for, as visible text
  "Not applicable: <label>, <label>" (labels in axis order) under the meta line, 12px `#7A7A75`.
  Entities with no missing values show no such line. N/A values do not affect any range.
- AC14: An entity whose values are all null renders as a degenerate polygon at the centre without
  errors (no NaN in any `points` / `cx` / `cy` attribute); the same holds when the pool range is
  null for a stat (no non-null value in the pool: t = 0.54 for non-null selected values, which
  cannot occur, and centre for nulls).

Labels and layout
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

Accessibility
- AC18: The chart is a labelled group with the accessible name "Radar chart". The SVG and the
  label overlay are hidden from assistive technology (decorative), and an equivalent text
  alternative exposes, per entity, the entity name and each stat label with its formatted value
  (`formatStat`) or "not applicable", so the data is available without seeing the shapes.
- AC19: Colour is never the only identifier: the legend shows each entity's full name next to its
  colour bar.
- AC20: The chart, message and legend contain no interactive elements and add no tab stops;
  keyboard order from the tab list to Bars / Radar and out of the panel is unchanged.

Code rules and tests
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

No ACs added. One clarification used below (not a new AC): AC4's "0 stats" case cannot reach the
radar because `ComparePanel` treats `rows.length === 0` as not ready and renders nothing (same as
Table and Bars, AC3 "behave exactly as before"). The 0-stats message is therefore covered at
component level (`RadarChart` with `rows=[]`), and at panel level the existing "every stat
deselected" behaviour is kept. See Q5.

## 3. Architecture

Approach: same shape as T11. A pure `radarModel` computes everything numeric; a presentational
`RadarChart` renders it; `ComparePanel` passes the `columns`, `rows` and `entities` (= the full
`useEntities(kind, season)` list, the league pool) it already holds. No new provider call, hook,
state, env var or dependency.

New files (all in `web/src/components/compare/`):
- `radarModel.ts` (pure, no React / DOM / provider):
  ```
  export const RADAR = { width: 520, height: 420, cx: 260, cy: 210, r: 150, floor: 0.08,
    labelT: 1.12, rings: [0.25, 0.5, 0.75, 1], centreBand: 8, minAxes: 3 } as const
  export interface Point { x: number; y: number }
  export type LabelAlign = 'middle' | 'start' | 'end'
  export function radarPoint(i: number, n: number, t: number): Point   // r1-rounded
  export function vertexT(value, range: StatRange, def): number
    // value == null -> 0 (A1); else floor + (1 - floor) * normalize(value, range, def,
    //   { invertLowerIsBetter: true })
  export function pointsAttr(points: Point[]): string                 // "x,y x,y ..."
  export interface RadarAxis { def: StatDef; end: Point;
    label: { x: number; y: number; left: number; top: number; align: LabelAlign } }
  export interface RadarValue { def: StatDef; value: StatValue | undefined; text: string; na: boolean }
  export interface RadarSeries { entity: Entity; colorIndex: number; points: Point[];
    pointsAttr: string; values: RadarValue[]; missing: string[] }   // missing = labels, axis order
  export interface RadarModel { ok: boolean; axes: RadarAxis[]; rings: string[]; series: RadarSeries[] }
  export function radarModel(rows: StatDef[], columns: CompareColumn[], pool: readonly Entity[]): RadarModel
  ```
  - `r1(v) = Math.round(v * 10) / 10` applied to x and y (A10), plus `+ 0` to avoid `-0`.
  - `ok = rows.length >= RADAR.minAxes`. When `!ok`, `axes`, `rings` and `points` are empty, but
    `series[].values` / `missing` are still filled so the legend and its N/A line work (AC5).
  - Ranges: `leagueRange(pool, def.key)` per row, computed once per call (AC8, AC11).
  - Label: point at t = 1.12; `left = r1(x / 520 * 100)`, `top = r1(y / 420 * 100)`;
    `align = |x - 260| < 8 ? 'middle' : x > 260 ? 'start' : 'end'`.
  - Uses `normalize`, `leagueRange`, `formatStat` from `web/src/lib/stats.ts` (no
    re-implementation, AC8). Returns new arrays; never mutates inputs (AC7).
- `RadarChart.tsx`: props `{ columns: CompareColumn[]; rows: StatDef[]; pool: readonly Entity[] }`;
  `useMemo(() => radarModel(...))`; markup in section 4. Uses `seriesColor`, `formatStat` output
  from the model, CSS module classes.
- `RadarChart.module.css`: design values from the requirements. Tokens where an exact match exists
  (`--color-text-muted` #7A7A75, `--text-12/14`, spacing tokens); literals `#e6e6e2` (already used as
  a literal in `IconButton.module.css` / `EntityCard.module.css`) and `#333` for grid and label.
  Copy the `.srOnly` class from `BarsChart.module.css`.
- Tests: `radarModel.test.ts`, `RadarChart.test.tsx`.

Changed files:
- `ComparePanel.tsx`: the `'2d'` branch renders
  `<RadarChart columns={columns} rows={rows} pool={entities} />` when `chart2 === 'radar'`; the
  `ChartPlaceholder` import stays (3D still uses it). Empty and loading branches untouched (AC3).
- `ComparePanel.test.tsx`: AC8 and AC31-on-2D updates (AC23), plus new T12 panel tests.
- `noLeagueLiterals.test.ts`: add `RadarChart.tsx` and `radarModel.ts` (imports, `sources`,
  planted-literal assertions).
- Unchanged: `ChartPlaceholder.tsx`, `placeholders.test.tsx`, `BarsChart*`, `barsModel*`,
  `lib/stats.ts`, `index.ts`, fixtures (tests build extra entities inline where needed).

Data / API changes: none. Dependencies: none (plain SVG, no chart library).

## 4. Design

Markup:
```
<div class=radar data-testid="radar">                     flex row, gap 24px, centred, wrap, min-width 0
  {ok ? (
    <div role="group" aria-label="Radar chart" class=box>   relative; flex 1 1 420px; max-width 640px; min-width 0
      <svg aria-hidden="true" focusable="false" viewBox="0 0 520 420" class=svg>  width 100%, block
        rings:  <polygon data-testid="radar-ring" class=grid points=.../>   x4
        spokes: <line data-testid="radar-spoke" class=grid x1=260 y1=210 x2 y2/>  xn
        per series (selection order, later on top):
          <g data-testid="radar-series" style={{'--series': seriesColor(i)}}>
            <polygon class=area points={pointsAttr}/>                       fill var(--series) .06, stroke 2px, round join
            <circle class=dot cx cy r="3.5"/>  per axis                     fill var(--series), stroke #fff 1.5
          </g>
      </svg>
      <div aria-hidden="true" class=labels>                  absolute, inset 0, pointer-events none
        per axis: <span class="label {align}" data-testid="radar-label" style={{left:`${left}%`, top:`${top}%`}}>{def.label}</span>
      </div>
      <ul role="list" class=srOnly>                         text alternative (AC18)
        per series: <li>{entity.name}<ul role="list"><li>{label}: {text | "not applicable"}</li>...</ul></li>
      </ul>
    </div>
  ) : (
    <p class=message>Pick at least 3 stats for the radar.</p>   flex 1; padding 60px; centred; 14px; muted
  )}
  <div class=legendCol>                                     flex 0 0 200px; column; gap 14px
    <ul role="list" aria-label="Legend" class=legend>
      per series: <li class=entry style={{'--series': seriesColor(i)}}>   border-left 3px var(--series); pl 12px; column gap 2px
        <span class=name>{entity.name}</span>                14px/600
        <span class=meta>{entity.meta}</span>                12px muted
        {missing.length > 0 && <span class=na>Not applicable: {missing.join(', ')}</span>}  12px muted
      </li>
    </ul>
    <p class=caption>Axes scaled to league range; "lower is better" stats are inverted so outward is always better.</p>
  </div>
</div>
```
Colour is passed as a CSS custom property (`--series`) consumed by `fill` / `stroke` /
`border-left-color` in the module, not as SVG presentation attributes (avoids relying on `var()`
in attributes and on jsdom's support for `style.fill`; tests read
`style.getPropertyValue('--series')`). Alignment classes: `.middle` `translate(-50%,-50%)`,
`.start` `translate(0,-50%)`, `.end` `translate(-100%,-50%)`; label 12px/500 `#333` nowrap.
The sr-only text never contains "Radar chart" or "coming soon" (existing regex assertions).

States:
- Loading (entities or defs pending): unchanged `!ready` branch, nothing below the tab row except
  the Chart type control (AC3).
- Empty (no selection): unchanged `EmptyState` (AC3).
- Error (provider failure): hooks return `[]`, `ready` false, nothing renders (as T10 / T11).
- Fewer than 3 resolved stats (1 or 2 at panel level, 0 at component level): message plus legend
  and caption, no SVG / labels / text alternative group (AC4, AC5).
- Success: chart, legend, caption. One selected entity still gets a polygon (A11). Unknown ids are
  skipped by `resolveColumns`, colours keep their selection index (AC10).
- All-null entity or null-range stat: vertices at centre or t 0.54, never NaN (AC14).
- Teams default selection has only 2 stats (`ztpts`, `ztlow` in fixtures; real defaults to be
  checked manually), so Teams on Radar may start in the message state; that is expected behaviour.

Widths:
- Desktop (1280px): box grows to 640px max; scale 640/520 = 1.23, so the side label anchors sit
  about 113px inside the box edge and the top / bottom anchors at 10% / 90% of its height, leaving
  room for 12px nowrap labels of the current label set (manual check, AC15). Legend column 200px to
  the right.
- Mobile (375px, Q4 default): flex-wrap moves the legend column below the chart; `.radar`, `.box`
  `min-width: 0` so the 420px basis shrinks to the panel width; SVG scales (AC16). The side anchors
  then sit about 58px from the box edge, so under `@media (max-width: 480px)` labels switch to
  `white-space: normal; max-width: 15vw; overflow-wrap: anywhere; font-size: 11px` (text-align
  follows the alignment class) so long labels wrap inside the box instead of overflowing. No
  `overflow: hidden` on the box (it would clip labels).
- 8 entities: 8 polygons in one SVG, legend column grows in height only (AC17).

Accessibility: group "Radar chart" with decorative `aria-hidden` SVG and overlay; sr-only nested
lists give name plus "label: value" or "not applicable" per stat (AC18); legend shows full `name`
beside the colour bar (AC19); no buttons, links, `tabindex` or focusable SVG (`focusable="false"`)
(AC20). Message is plain text, not a live region (it appears from a user action next to it).

## 5. Risk and security

- Input validation: values come from the typed DataProvider; `leagueRange` ignores nulls,
  `normalize` handles null value and null range. Safeguard: model tests for missing key, null
  value, all-null entity and all-null pool, asserting no `NaN` in any coordinate or points string
  (T1).
- Floating point: `cos(pi/2)` style residues and `-0` are removed by `r1` plus `+ 0`; tests assert
  exact rounded numbers (T1).
- Auth / data exposure: none; read-only display of already-loaded data, React text only (no
  `dangerouslySetInnerHTML`).
- Failure modes: stale pool after a kind / season switch cannot render because `useEntities`
  returns `[]` until fresh data arrives (`ready` false); covered by T5 kind and season tests.
- jsdom support for SVG and custom properties: mitigated by the `--series` approach and by
  asserting attributes (`points`, `cx`, `cy`) rather than computed styles.
- Regression: the T11 AC8 test asserts the Radar placeholder, so it is updated deliberately and
  made stronger (T4); `placeholders.test.tsx` and the T11 keyboard test stay unchanged.
- League literals: guard test extended (T3).

## 6. Gaps check

- Auth: not applicable (no accounts or protected data).
- Validation: null / missing / null range / min equals max handled and unit tested (T1).
- Error handling: provider failure collapses to nothing rendered; T5 asserts no radar, no crash.
- Mobile: flex-wrap plus label wrapping under 480px; manual 375px check in T6.
- Accessibility: labelled group, decorative SVG hidden, text alternative, full names in legend,
  no tab stops; tested in T2 and T5.
- Config and env vars: none needed.
- Tests: pure model tests, component tests, panel tests, guard test, deliberate existing-test
  updates; nothing deleted or weakened.

## 7. Tasks

Fixture facts (from `web/src/test/compareFixtures.ts`; default selection zp1, zp2, zp3, stats zhigh,
zlow, zbig; canonical axes zhigh (0, up), zlow (1, lower right), zbig (2, lower left); pool = all 8
players):
- zhigh range 1..10: zp1 (10) at t 1 -> (260, 60); zp3 (5, smallest in selection, not pool min):
  t = 0.08 + 0.92 * 4/9 = 0.4889 -> (260, 136.7).
- zlow (lower is better) range 1.25..9: zp2 (1.25, pool min) at t 1 -> (389.9, 285); zp1 (3.50):
  t = 0.08 + 0.92 * (1 - 2.25/7.75) = 0.7329 -> (355.2, 265).
- zbig range 1000..4000: zp3 (1000, pool min) at t 0.08 -> (249.6, 216); zp2 (1200, middle of the
  selection): t = 0.1413 -> (241.6, 220.6).
- zsolo: only zp1 non-null (7), range 7..7 -> zp1 t 0.54; zp2..zp8 null -> centre; zp3 has no zsolo
  key (missing) -> centre.
- Label anchors for 3 axes: (260, 42) middle, left 50% top 10%; (405.5, 294) start, left 78% top
  70%; (114.5, 294) end, left 22% top 70%.
- Teams: 3 stats only with `teamStats: ['ztpts', 'ztlow', 'ztwin']`; default teams stats are 2
  (message state).
Every number above is recomputed by the implementer in the test from the formula, then asserted
as the literal rounded value.

T1. Radar geometry model (AC7, AC8, AC9, AC10, AC11, AC12, AC13, AC14, AC15 geometry part)
- Files: `web/src/components/compare/radarModel.ts`, `web/src/components/compare/radarModel.test.ts`.
- Implement section 3 API. Tests: `radarPoint` 3-axis and 4-axis t = 1 points (exact); pool max
  distance 150 and pool min distance 12 (higher-is-better); inversion for zlow (pool min t 1, pool
  max zp4 9 at t 0.08); `min === max` gives 0.54; null and missing value at exactly (260, 210);
  `ok` false for 0, 1, 2 rows with empty axes / rings / points but filled `missing`; rings are 4
  strings matching `radarPoint` at 0.25 / 0.5 / 0.75 / 1; spokes end at t 1; label anchors at
  distance 168 (> 150), alignment rule including the 8-unit band, `left` / `top` percentages above;
  for n = 3..8 every label anchor is outside R and aligned away from the centre; axis order and
  labels follow `rows`; series order and `colorIndex` follow `columns`; zp3 zhigh strictly between
  0.08 and 1 (AC8); adding zp4 to columns leaves zp1..zp3 points unchanged and a different pool
  changes them (AC11); all-null entity and all-null pool produce no `NaN` and `pointsAttr`
  matches `/^[\d.]+,[\d.]+( [\d.]+,[\d.]+)*$/`; `missing` lists labels in axis order; values
  `text` from `formatStat`; two calls give deep-equal output and inputs are unchanged
  (`structuredClone` snapshot compare).

T2. RadarChart component and styles (AC1 component part, AC4, AC5, AC10, AC12, AC13, AC14, AC16
CSS, AC17, AC18, AC19, AC20, AC22)
- Files: `web/src/components/compare/RadarChart.tsx`, `RadarChart.module.css`,
  `RadarChart.test.tsx` (explicit props from `compareFixtures`, no provider).
- Tests: group "Radar chart" with one `svg`; 4 `radar-ring`, 3 `radar-spoke`, 3 `radar-series`,
  3 dots per series; series `--series` = `var(--series-1/2/3)` and an unknown-id gap keeps
  `var(--series-3)` for the third selected; zp1 polygon `points` equals `radarModel(...)` output
  and contains "260,60"; zp2 has "389.9,285" (inversion); stat set with zsolo puts zp2's vertex and
  dot at `260,210` and its legend shows "Not applicable: Zsolo", zp1 shows no such line; labels
  render `StatDef.label` in canonical order with the expected `left` / `top` and alignment class;
  0, 1 and 2 rows show "Pick at least 3 stats for the radar.", no `svg`, no `radar-label`, no
  group "Radar chart", but legend and caption present; legend names (full `name`), meta and caption
  text exact; svg and overlay `aria-hidden`; text alternative contains, per entity, the name and
  "Zhigh: 10", "Zlow: 3.50", and "not applicable" for nulls; 8 entities give 8 series and 8 legend
  items; no `button`, `a`, `[tabindex]` inside `radar`; Teams fixture with 3 stats renders the same
  structure, and with the 2 default team stats shows the message.

T3. League-literal guard (AC21)
- File: `web/src/components/compare/noLeagueLiterals.test.ts`.
- Import `./RadarChart.tsx?raw` and `./radarModel.ts?raw`, add both to `sources` (existing literal
  and import checks then run on them); add planted-literal assertions for both. Existing
  assertions unchanged.

T4. Wire into ComparePanel and update existing tests (AC1, AC2, AC3, AC23)
- Files: `web/src/components/compare/ComparePanel.tsx`, `ComparePanel.test.tsx`.
- Code: Radar branch renders `<RadarChart columns={columns} rows={rows} pool={entities} />`.
- Update "AC8: 2D shows Bars chart, then Radar chart after toggling": keep the Bars assertions;
  after clicking Radar assert `findByRole('group', { name: 'Radar chart' })`, the radar caption
  text, `queryByText(/coming soon/)` null, no group "Bars chart", no bars caption; click Bars and
  assert the Bars chart is back, group "Radar chart" null, radar caption null and
  `queryByText(/Radar chart/)` null (kept). Rename only if needed to keep the title accurate; the
  title already fits.
- Extend "AC31: loading on 2D shows no placeholder and no empty message": keep all its assertions;
  add a second phase or sibling-style block in the same test that clicks Radar while still
  pending and asserts no group "Radar chart", no "Pick at least 3 stats" text, no radar caption,
  no `svg` in the 2D panel and no "Legend" list; then resolve and assert the Radar chart appears.
  (Order: keep the existing Bars-pending assertions first, then switch to Radar before resolving.)
- No other existing test is edited.

T5. Panel-level behaviour tests (AC2, AC3, AC6, AC8, AC9, AC11, AC17, AC20, AC22)
- File: `web/src/components/compare/ComparePanel.test.tsx` (new `describe('T12 ...')` blocks).
- Pool not selection: on Radar, zp3 zhigh vertex is `260,136.7` and zp2 zbig `241.6,220.6`.
- Selection change: probe toggle zp4 adds a 4th series and legend item; zp1..zp3 `points`
  unchanged.
- Season change: provider where season '3030' changes zp1 zbig to 8000; zp2 zbig vertex moves.
- Kind switch: probe to teams shows the message (2 default team stats) with team legend names;
  back to players restores the chart.
- AC6: defaults `playerStats: ['zhigh', 'zlow']` show the message; probe stat zsolo shows the chart
  with 3 labels; probe stat zsolo again restores the message.
- Empty selection on Radar: empty state, no radar, message, legend or caption.
- Failed entity load on Radar: nothing rendered, no crash.
- Table and 3D tabs with `chart2` radar: no radar elements.
- Keyboard: on Radar, Tab from the 2D tab reaches Bars then Radar, the radar root holds no
  focusable element, and the next Tab leaves it.

T6. Verification (AC15, AC16, AC17, AC24)
- Run `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Manual `npm run dev` check: 1280px with Players and Teams defaults (Teams with a third stat
  added), the longest stat label of each kind placed on a left and a right axis, no label overlap
  or clipping; 375px with no horizontal page scroll, legend below the chart, labels wrapping inside
  the box; 8 entities. Record results in the QA report, not in code.

## 8. Open questions (defaults applied, none blocking)

1. Q1 (AC12, A1): nulls exactly at the centre (default, per ticket) or at the design's 0.08 floor
   with the legend note only?
2. Q2 (AC13, A2): legend wording "Not applicable: <labels>" (default) or shorter "N/A: <labels>"?
3. Q3 (AC9, A4): canonical axis order (default, matches Table and Bars) or pick order (design
   script)?
4. Q4 (AC16, A6): at narrow widths wrap labels under 480px (default) or inset the chart?
5. Q5 (AC4): with every stat deselected the panel keeps today's "nothing rendered" behaviour
   (default, AC3) rather than showing the radar message; should the 0-stats message also appear at
   panel level on Radar?
