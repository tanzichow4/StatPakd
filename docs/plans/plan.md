# Plan: T11 2D Bars chart

Source: `docs/tickets/T11-bars-chart.md`, requirements `docs/plans/00-requirements.md` (the
contract: AC1 to AC25, assumptions A1 to A9). Run non-interactively: the defaults for Q1 to Q3
apply (stack on narrow widths, muted N/A colour, group name "Bars chart").

## 1. Goal and out of scope

Goal: replace the "Bars chart — coming soon" placeholder on the 2D tab (Bars selected) with the real
2D Bars chart: one row per selected stat and, inside it, one labelled horizontal bar per selected
entity, scaled to the full league pool range for the current kind and season. Bars follow the
design exactly (never inverted), show "—" and no fill for N/A, and expose each entity name and value
as text.

Out of scope: Radar chart, its inversion and the "Pick at least 3 stats" message (T12); 3D (T13,
T14); Team breakdown and stacked bars (T15 to T17); tooltips, hover, animation, sorting, axis ticks or
gridlines; full `name` / `meta` / jersey numbers in the name column; any change to `lib/stats.ts`
behaviour, domain types, DataProvider, MockProvider data or the reducer; contrast fixes for
`#9A9A95` / `#B5B5B0` and axe audit (T18); Playwright (T19).

## 2. Acceptance criteria (copied from 00-requirements.md, same numbers)

Placement and switching
- AC1: With "2D chart" selected, Bars active (`state.chart2 === 'bars'`), a non-empty selection and
  loaded data, the 2D tab panel shows the Bars chart and no "Bars chart — coming soon" text.
- AC2: Clicking "Radar" replaces the Bars chart with the existing "Radar chart — coming soon"
  placeholder; clicking "Bars" brings the chart back.
- AC3: Table and 3D tabs behave exactly as before. The empty state and the loading state (selection
  non-empty, data pending: nothing below the tab row except the Chart type control) on 2D behave as
  before; no bars, rows or caption render in either.

Rows and lines
- AC4: One stat row per Table row (`resolveRows`: selected stats with a definition, canonical
  order), each headed by `StatDef.label`.
- AC5: `lowerIsBetter` rows show the note "lower is better" under the label; others show no note.
- AC6: One line per resolved column (`resolveColumns`: selection order, unknown ids skipped), each
  with the `seriesColor(colorIndex)` square, the entity's `shortName`, the track and the value.
- AC7: Value text is `formatStat(value, def)`.
- AC8: The caption "Bar length scaled to league range." appears once, below the last stat row,
  whenever the chart is shown.

Bar width
- AC9: Non-null fill width is `barWidth(value, range)` percent with `range = leagueRange(pool,
  def.key)` and `pool` = every entity returned for the active league, current kind and season (the
  picker's unfiltered list), not only the selection. Pool min gets 5%, pool max 100%, and a selected
  entity that is neither pool min nor max gets a width strictly between, even if it is the largest
  or smallest of the selection.
- AC10: When the pool range has `min === max`, every non-null value gets `barWidth` for normalized
  0.5 (about 52-53%).
- AC11: Bars are never inverted: for a `lowerIsBetter` stat the larger value gets the longer bar.
- AC12: Changing season or kind recomputes ranges and updates widths and values without reload.
  Adding or removing a selected entity does not change other entities' widths.

Not applicable values
- AC13: A null or missing value shows "—" (U+2014) in the value column in the Table's muted N/A
  colour (`#B5B5B0`) and renders no fill (no element, or zero width). The empty track and name
  column still render.
- AC14: N/A is exposed to assistive technology as "not applicable"; N/A values do not affect the
  range.

Accessibility
- AC15: The chart is a labelled group ("Bars chart"). Each stat row is a labelled group or list
  named by the stat label (plus "lower is better" when applicable). Each entity line exposes the
  entity name and formatted value (or "not applicable") as text.
- AC16: Colour square, track and fill are decorative and hidden from AT; the name is always visible.
- AC17: No interactive elements and no tab stops; keyboard order is unchanged.

Layout
- AC18: At 1280px with 3 default players: 160px label column, 110px name column, 16px tracks, 70px
  value column, no horizontal page scroll.
- AC19: With 8 entities every row shows 8 lines; long short names truncate with an ellipsis in the
  110px column and never push track or value out of place.
- AC20: At 375px no horizontal page scroll from the chart; every track has visible non-zero width
  and every value is fully visible (A6).
- AC21: Structure, styles and caption identical for Players and Teams.

Code rules and tests
- AC22: New source files have no league literals, do not import `data/` or `MockProvider`, and are
  added to `web/src/components/compare/noLeagueLiterals.test.ts` (sources map). Pool data comes from
  the existing `useEntities` hook / entities already loaded by `ComparePanel`.
- AC23: Component tests cover: width from the pool range with the selection a strict subset and
  selected values not pool min/max (exact `%`); pool min 5% and max 100%; equal range;
  lower-is-better not inverted; N/A "—", no fill, "not applicable"; series colour by selection
  index; row order and labels; "lower is better" note; caption; 8 entities; accessible name/value
  per line; Bars / Radar switching in `ComparePanel`.
- AC24: `ComparePanel.test.tsx` "AC8: 2D shows Bars chart, then Radar chart after toggling" is
  updated to assert the Bars chart, then the Radar placeholder, then the Bars chart's absence.
  "AC31: loading on 2D shows no placeholder and no empty message" is extended to also assert no bars
  while loading. All other tests unchanged and passing, including `placeholders.test.tsx`.
- AC25: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` pass.

No ACs added: the requirements cover data source, N/A, a11y, both widths and the test updates.

## 3. Architecture

Approach: a presentational `BarsChart` fed by `ComparePanel`, which already holds `entities`
(the full `useEntities(kind, season)` list = league pool, A2/A8), `columns` and `rows`. No new
provider call, hook, dependency, env var or state.

New files (all in `web/src/components/compare/`):
- `barsModel.ts`: pure function, no React.
  ```
  export interface BarLine { entity: Entity; colorIndex: number; value: StatValue | undefined;
    width: number; text: string; na: boolean }
  export interface BarRow { def: StatDef; lines: BarLine[] }
  export function barRows(rows: StatDef[], columns: CompareColumn[], pool: readonly Entity[]): BarRow[]
  ```
  For each def: `range = leagueRange(pool, def.key)`; per column `value = entity.stats[def.key]`,
  `width = barWidth(value, range)`, `text = formatStat(value, def)`, `na = value == null`.
  Reuses `leagueRange`, `barWidth`, `formatStat` from `web/src/lib/stats.ts`; no re-implementation of
  normalization (A1).
- `BarsChart.tsx`: props `{ columns: CompareColumn[]; rows: StatDef[]; pool: readonly Entity[] }`;
  `useMemo(() => barRows(...))`; renders markup in section 4. Uses `seriesColor`,
  `NULL_PLACEHOLDER`, `cx`, `useId` for label ids.
- `BarsChart.module.css`: design values from requirements, using tokens (`--color-divider` #F0F0ED,
  `--color-track-alt` #F3F3F0, `--color-text-muted` #7A7A75, `--color-text-faint` #9A9A95,
  `--color-text-na` #B5B5B0, `--font-mono`, `--radius-3`, `--text-11/12/13/14`, `--space-*`).
- Tests: `barsModel.test.ts`, `BarsChart.test.tsx`.

Changed files:
- `ComparePanel.tsx`: in the `'2d'` branch, `chart2 === 'bars'` renders
  `<BarsChart columns={columns} rows={rows} pool={entities} />`; Radar keeps
  `<ChartPlaceholder title="Radar chart" />`. Empty/loading branches untouched (AC3).
- `ComparePanel.test.tsx`: AC8 and AC31 updates, plus new panel tests (T5).
- `noLeagueLiterals.test.ts`: add `BarsChart.tsx` and `barsModel.ts` to imports and `sources`; add a
  planted-literal line for the new file in "the scan would catch a planted literal".
- `ChartPlaceholder.tsx` and `placeholders.test.tsx`: unchanged (Radar and 3D still use it).
- `index.ts`: unchanged (only `ComparePanel` is public).

Data/API changes: none. Dependencies: none.

## 4. Design

Markup (one chart):
```
<div role="group" aria-label="Bars chart" class=chart>
  per row: <div role="group" aria-labelledby="{labelId} {noteId?}" class=row>
    <div class=head><span id=labelId class=label>{def.label}</span>
      {lowerIsBetter && <span id=noteId class=note>lower is better</span>}</div>
    <ul role="list" class=bars>  (explicit role: list-style:none strips it in Safari)
      per line: <li class=line>
        <span class=name><span aria-hidden class=swatch style=bg:seriesColor(i)/>{shortName}</span>
        <span aria-hidden class=track data-testid="bar-track">
          {!na && <span class=fill data-testid="bar-fill" style=width:{width}%;bg:seriesColor(i)/>}
        </span>
        <span class=srOnly>: </span>   (separator so AT reads "Quenby: 10")
        {na ? <><span aria-hidden class="value na">—</span><span class=srOnly>not applicable</span></>
            : <span class=value>{text}</span>}
      </li>
    </ul>
  </div>
  <p class=caption>Bar length scaled to league range.</p>
</div>
```
`title={entity.shortName}` is not added (would be a hover tooltip; out of scope). Truncated names
remain fully available to AT because the text node holds the full `shortName`.

States:
- Loading (selection non-empty, entities or defs pending): unchanged `!ready` branch, nothing below
  the tab row except the Chart type control (AC3).
- Empty (no selection): unchanged `EmptyState` (AC3).
- Error (entity or def load fails): hooks return `[]`, so `ready` is false and nothing renders, as
  in T10. No new error UI.
- Selection non-empty but every stat deselected: `rows` empty, `ready` false, nothing renders (same
  as Table).
- Success: chart. A single selected entity still gets a bar (A7). Unknown ids skipped (AC6).
- Stat with no non-null pool value: `leagueRange` gives `null`; all lines are N/A, so no fill.

Widths:
- Desktop (1280px): row = flex with wrap, `gap: 20px`, `padding: 14px 0`, bottom border, items
  centred. Head `flex: 0 0 160px`, bars `flex: 1 1 260px; min-width: 0`. At wide widths this is
  identical to the design grid `160px minmax(0,1fr)` (AC18). Line: flex, gap 12px; name
  `flex: 0 0 110px`, 12px/600, nowrap, overflow hidden, ellipsis (name text in an inner span with
  `min-width: 0; overflow: hidden; text-overflow: ellipsis`, swatch `flex: none`); track
  `flex: 1; min-width: 0; height: 16px`; value `flex: 0 0 70px; text-align: right`, mono 13px,
  nowrap. Bars cell `display: flex; flex-direction: column; gap: 6px`. Head column, gap 2px; label
  14px/500; note 11px faint. Caption 12px muted, `padding-top: 10px`.
- Mobile (375px, A6/Q1 default): when the row is narrower than 160 + 20 + 260 = 440px the bars cell
  wraps below the label (flex-wrap, no media query, matching the T07/T09 wrap approach). Bars cell
  then takes the full width (about 300px+ at 375px), leaving the track > 90px; value keeps its 70px
  column (AC20). Chart root and row get `min-width: 0` so nothing forces page overflow.
- 8 entities: lines stack vertically, so width is unaffected; only height grows (AC19).

Accessibility: AC15 to AC17 via the markup above; no `tabIndex`, buttons or links; colour swatch,
track and fill `aria-hidden`; N/A "—" `aria-hidden` with sr-only "not applicable" (same as the
Table). Reuse the `.srOnly` pattern by copying the class into `BarsChart.module.css` (CSS modules
are per-file; no shared utility exists yet).

## 5. Risk and security

- Input validation: values come from the typed DataProvider. `barWidth` already clamps semantics to
  0 for null and 5 to 100 otherwise; `leagueRange` ignores nulls. Safeguard: model test with a
  `null` range (all-null pool) and a missing key (`undefined`) to prove no `NaN%` width (T2).
- Auth / data exposure: none; read-only display of already-loaded data. Names render as React text
  (no `dangerouslySetInnerHTML`).
- Failure modes: stale pool after kind/season switch is prevented because `useEntities` returns
  `[]` until current data arrives, so `ready` is false (covered by T5 season and kind tests).
  Pool/selection mismatch (selected id not in pool) is impossible to render because columns come
  from the same list.
- Regression risk: replacing the placeholder breaks the T10 AC8 test by design; it is updated
  deliberately and made stronger (T4). `placeholders.test.tsx` stays untouched.
- League literals: guard test extended (T3).

## 6. Gaps check

- Auth: not applicable (no accounts or protected data).
- Validation: null / missing / no-range handled by existing `lib/stats.ts`; tested in T2.
- Error handling: provider failures already collapse to "nothing rendered"; T5 asserts no chart.
- Mobile: flex-wrap stacking at narrow widths (Q1 default), manual check at 375px in T6.
- Accessibility: labelled groups, list semantics, text values, decorative visuals hidden, no tab
  stops; tested in T2/T5.
- Config and env vars: none needed.
- Tests: model unit tests, component tests, panel tests, guard test, existing-test updates.

## 7. Tasks

Fixture facts used by tests (from `web/src/test/compareFixtures.ts`, default selection zp1, zp2, zp3,
stats zhigh, zlow, zbig; pool = all 8 players):
- zhigh pool range 1..10 (zp4 null ignored): zp1 100%, zp2 100%, zp3 (5) 47% (smallest in the
  selection but not 5%).
- zlow (lowerIsBetter, 2 decimals) range 1.25..9: zp2 5%, zp1 (3.50) 33%, zp3 (2.00) 14%; zp1 is
  longer than zp2 (not inverted).
- zbig range 1000..4000: zp1 100%, zp2 (1,200) 11% (middle of selection, strictly between), zp3 5%.
- zsolo: only zp1 non-null (7), range 7..7: zp1 gets `barWidth(7, {min: 7, max: 7})` (52 or 53);
  zp2 N/A.
- zsign (signed, 1 decimal): zp1 "+2.0", zp2 "-1.0".
- Teams ztpts range 25..30: zt3 (28) 62%.

T1. Bars model (AC4, AC6, AC7, AC9, AC10, AC11, AC14)
- Files: `web/src/components/compare/barsModel.ts`, `web/src/components/compare/barsModel.test.ts`.
- `barRows(rows, columns, pool)` as in section 3. Tests: widths above with pool = all players and
  columns = zp1..zp3 (exact numbers); pool min 5 / max 100; equal range equals `barWidth` for 0.5;
  zlow zp1 width > zp2 width; null and missing value give `width 0`, `na true`, text "—"; an
  all-null stat gives no `NaN`; row and line order follow `rows` / `columns`; `colorIndex` carried
  through; adding zp4 to columns leaves zp1..zp3 widths unchanged (AC12, range independent of
  selection).

T2. BarsChart component and styles (AC5, AC6, AC7, AC8, AC13, AC14, AC15, AC16, AC17, AC18, AC19,
AC20, AC21)
- Files: `web/src/components/compare/BarsChart.tsx`, `BarsChart.module.css`, `BarsChart.test.tsx`
  (explicit props from `compareFixtures`, no provider).
- Tests: group "Bars chart" present; row groups named "Zhigh", "Zlow lower is better", "Zbig" in
  canonical order; note text only on zlow; each `listitem` text is `shortName` + value
  (e.g. "Quenby: 4,000"), N/A line "Rastow: —not applicable" style text with "—" `aria-hidden`
  and no `bar-fill` but a `bar-track`; fill `style.width` equals the exact percentages from the
  fixture facts; swatch and fill background `var(--series-1/2/3)` and an unknown-id gap keeps
  `var(--series-3)` for the third selected; caption appears exactly once and after the last row
  (`compareDocumentPosition`); 8 entities give 8 `listitem`s per row; swatch, track and fill are
  `aria-hidden`; no `button`, `a`, `[tabindex]` inside; Teams fixture renders the same structure
  (group, row groups, caption) with ztpts zt3 at 62%.

T3. League-literal guard (AC22)
- File: `web/src/components/compare/noLeagueLiterals.test.ts`.
- Import `./BarsChart.tsx?raw` and `./barsModel.ts?raw`, add both to `sources` (existing checks then
  run on them, including the data/ and MockProvider import check); add a planted-literal assertion
  for `BarsChart.tsx`. Existing assertions unchanged.

T4. Wire into ComparePanel and update existing tests (AC1, AC2, AC3, AC24)
- Files: `web/src/components/compare/ComparePanel.tsx`, `ComparePanel.test.tsx`.
- Code: Bars branch renders `<BarsChart columns={columns} rows={rows} pool={entities} />`.
- Update "AC8: 2D shows Bars chart, then Radar chart after toggling": after clicking 2D,
  `await findByRole('group', { name: 'Bars chart' })`, assert caption "Bar length scaled to league
  range." present, `queryByText('Bars chart — coming soon')` null and no Radar text; click Radar,
  assert "Radar chart — coming soon" present, `queryByRole('group', { name: 'Bars chart' })` null,
  caption null and `queryByText(/Bars chart/)` null (kept). Click Bars again, chart is back (AC2).
- Extend "AC31: loading on 2D shows no placeholder and no empty message": keep its three
  assertions, add no group "Bars chart", no caption text and no `bar-fill`/`listitem` while pending;
  then resolve the pending entities and assert the Bars chart appears.
- No other existing test is edited.

T5. Panel-level behaviour tests (AC3, AC9, AC12, AC17, AC21, AC23)
- File: `web/src/components/compare/ComparePanel.test.tsx` (new `describe('T11 ...')` blocks).
- Pool not selection: default selection on 2D, zbig zp2 fill is 11% and zhigh zp3 is 47%
  (provider returns all 8 players).
- Selection change: probe toggle zp4, zp1..zp3 widths unchanged, a 4th line appears.
- Season change: provider where season '3030' doubles zp1 zbig (range 1000..8000); zp2 zbig
  changes 11% to 8% and zp1 value text becomes "8,000".
- Kind switch: probe to teams shows rows "Ztpts", "Ztlow lower is better" and zt3 ztpts at 62%;
  back to players restores.
- Empty selection on 2D: no group "Bars chart", no caption (AC3).
- Failed entity load on 2D: no chart, no crash.
- Keyboard: on 2D with chart rendered, Tab from the 2D tab reaches Bars then Radar, and the chart
  contains no focusable element (AC17).

T6. Verification (AC18, AC19, AC20, AC25)
- Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (and `npm run format`).
- Manual browser check with `npm run dev` at 1280px (column widths 160/110/16/70 in devtools, no
  horizontal scroll) and 375px (label stacked above bars, tracks visible, values not clipped), with
  3 and 8 entities, Players and Teams. Record results in the QA report, not in code.

## 8. Open questions (defaults applied, none blocking)

1. Q1 (AC20, A6): narrow-screen layout: stack label above bars (default, implemented via flex-wrap
   at under 440px row width) or keep the design grid with horizontal scroll inside a container?
2. Q2 (AC13, A3): N/A "—" in the muted Table colour `#B5B5B0` (default) or the design's plain text
   colour?
3. Q3 (AC15, A5): chart accessible name "Bars chart" (default) or include the kind, e.g. "Bars
   chart of selected players"?
