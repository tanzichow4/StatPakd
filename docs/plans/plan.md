# Plan: T10 Compare panel, tabs and Table view

Source: `docs/tickets/T10-compare-panel-and-table.md`, requirements `docs/plans/00-requirements.md`
(contract: AC1 to AC30, assumptions A1 to A12). Run non-interactively: assumptions apply as recorded.

## 1. Goal and out of scope

Goal: fill the empty "Stat views" region beside the stat sidebar with the Compare main panel
(tabs "Table" / "2D chart" / "3D chart", a Bars | Radar control while 2D is active, chart
placeholders, and an empty state). The Table tab shows a real, accessible `<table>` of the selected
entities against the selected stats, with best-value pills, "—" for N/A and horizontal scrolling
instead of squashing, keyboard-operable at 375px and 1280px.

Out of scope (from requirements): real Bars (T11), Radar and its "pick 3 stats" message (T12), 3D
math/chart/axes/camera (T13, T14); Team breakdown mode and its control (T15 to T17; `teamMode:
inside` renders as compare, A9); sorting, reordering or removing entities from the table; changes
to domain types, DataProvider, MockProvider data or the reducer (default `view` stays `3d`);
contrast fixes, touch targets, axe audit (T18); Playwright (T19).

## 2. Acceptance criteria

AC1 to AC30 are copied by number from `docs/plans/00-requirements.md` and are not repeated in full
here to avoid drift; that file is the contract. Short index for task linking:

- AC1 region "Stat views" in main after sidebar, contains panel, tab list first. AC2 wrap at 375px,
  side-by-side at 1280px. AC3 the single deliberate App.sidebar.test change (section 7, T7).
- AC4 tab list "View", tabs Table/2D chart/3D chart = `num`/`2d`/`3d`, default 3D selected.
  AC5 click and keyboard (roving tabindex, arrows wrap, Home/End). AC6 every `aria-controls`
  resolves to a `tabpanel` with `aria-labelledby`; non-selected panels hidden. AC7 "Chart type"
  Bars/Radar control only on 2D, `aria-pressed`, wraps at 375px. AC8 placeholders.
- AC9 columns = `sel[kind]` order, `seriesColor(index in sel)`, unknown ids skipped. AC10 rows =
  `stats[kind]` with a def, canonical order, `StatDef.label`. AC11 kind and season switching.
- AC12 default 3 x 6 for both kinds. AC13 `formatStat`. AC14 N/A "—" + "not applicable" for AT.
  AC15 `bestIndex` pills + "best" for AT. AC16 "lower is better" note. AC17 compact headers at
  5 to 8 entities (`shortName` + `badge`, A4). AC18 visible caption.
- AC19 real `<table>`, `th scope=col/row`, roles survive grid CSS in a browser. AC20 focusable named
  scroll region "Comparison table". AC21 grid template and min-width `190 + 130n`.
- AC22 empty state for both kinds, every tab, no table/caption. AC23 no empty state while loading.
- AC24 to AC27 browser checks. AC28 no league literals + guard test. AC29 component tests list.
  AC30 lint, typecheck, test, build pass.

Added criteria (gaps found while planning):

- AC31 (added): While a non-empty selection is still loading (entities or stat defs not yet
  resolved) the Table tab renders neither the table nor the caption nor the empty state (no
  zero-column or zero-row table flashes). Refines AC23.
- AC32 (added): Hidden tab panels render no content (A10), so the table and its stat labels / entity
  names never appear in the DOM unless the Table tab is selected. This keeps existing App-level
  `getByText` queries (picker names, sidebar labels) unambiguous on the default 3D view.

## 3. Architecture

Approach: one new folder `web/src/components/compare/`, mounted inside the existing `<section
aria-label="Stat views">` in `App.tsx`. Data via existing hooks (A1); pure logic in a helper module
that is unit-tested on its own. Two additive, backwards-compatible props on ui primitives.

Files (all new unless marked):

| File | Exports | Role |
|---|---|---|
| `web/src/components/compare/ComparePanel.tsx` + `ComparePanel.module.css` | `ComparePanel` | Reads `useAppState`, `useEntities(kind, season)`, `useStatDefs(kind)`. Renders root (flex column, gap 16, `min-width: 0`), tab row, three `TabPanel`s, empty state, placeholders, table. |
| `web/src/components/compare/CompareTable.tsx` + `CompareTable.module.css` | `CompareTable` (props `kind`, `columns: CompareColumn[]`, `rows: StatDef[]`) | Scroll region, `<table>`, caption note below. |
| `web/src/components/compare/ChartPlaceholder.tsx` + `.module.css` | `ChartPlaceholder` (prop `title: string`) | Static box, text `` `${title} — coming soon` ``. No interactive elements. |
| `web/src/components/compare/EmptyState.tsx` + `.module.css` | `EmptyState` (prop `kind: EntityKind`) | `<p>` "Add a {kindSingular(kind)} to start comparing." |
| `web/src/components/compare/compareTable.ts` | see below | Pure helpers, no React. |
| `web/src/components/compare/index.ts` | `ComparePanel` | Barrel. |
| `web/src/components/compare/noLeagueLiterals.test.ts` | | AC28 guard. |
| `web/src/App.tsx` (edit) | | `<section className={styles.panel} aria-label="Stat views"><ComparePanel /></section>`. Section stays in App (AC1). |
| `web/src/components/ui/Tabs.tsx` (edit, additive) | `Tabs` gets optional `className?: string` (merged onto the tablist root); `TabPanel` gets optional `hidden?: boolean` (sets the `hidden` attribute). Defaults keep today's output, so `ui.test.tsx` is unchanged. |
| `web/src/components/ui/SegmentedControl.tsx` + `.module.css` (edit, additive) | optional `size?: 'md' \| 'sm'` (default `'md'`). `.sm`: track padding 2px, gap 0, radius 7; item 12px/600, padding `4px 12px`, radius 5; active white + `--shadow-segmented`. (A12) |

`compareTable.ts` exports (signatures are the contract for the test-writer):

```ts
export const COMPACT_HEADER_MIN = 5            // 5+ entities => compact headers (AC17)
export interface CompareColumn { entity: Entity; colorIndex: number }
export function resolveColumns(selIds: readonly EntityId[], entities: readonly Entity[]): CompareColumn[]
  // sel order; colorIndex = index in selIds; ids not found are skipped (AC9)
export function resolveRows(statKeys: readonly string[], defs: readonly StatDef[]): StatDef[]
  // keys that have a def, ordered by canonicalStatOrder(defs) (AC10, A2)
export function tableMinWidth(n: number): number   // 190 + 130 * n (AC21)
export function gridColumns(n: number): string     // `minmax(170px,1.3fr) repeat(${n}, minmax(0,1fr))`
export function headerLines(entity: Entity, compact: boolean): { title: string; sub: string }
  // compact ? { shortName, badge } : { name, meta }  (AC17, A4)
```

ComparePanel logic:

- `hasSelection = sel[kind].length > 0`; `columns = resolveColumns(...)`; `rows = resolveRows(...)`;
  `ready = columns.length > 0 && rows.length > 0`.
- Tab ids from `useId()`; options `[{num,'Table'},{2d,'2D chart'},{3d,'3D chart'}]`; `onChange`
  dispatches `setView`. Bars | Radar `SegmentedControl` (`label="Chart type"`, `size="sm"`,
  options `bars`/'Bars', `radar`/'Radar', dispatches `setChart2`) rendered only when
  `view === '2d'`, after the tablist in DOM order, inside the tab row.
- Three `TabPanel`s always in the DOM; `hidden={value !== view}`; hidden panels get no children
  (AC6, AC32).
- Visible panel content: `!hasSelection` -> `EmptyState` (plus `ChartPlaceholder title="3D chart"`
  on 3D only, A5/Q4). `hasSelection && !ready` -> nothing on Table and 2D (AC23, AC31); 3D still
  shows its placeholder. `ready` -> Table: `CompareTable`; 2D: `ChartPlaceholder` "Bars chart" or
  "Radar chart" by `chart2`; 3D: "3D chart" placeholder.

Table semantics approach (AC19, AC21):

- Markup: `<table aria-label="Selected {kind} compared by stat">` > `<thead>` > `<tr>` with
  `<th scope="col">Stat</th>` + one `<th scope="col">` per column (dot `<span aria-hidden="true">`
  with `background: seriesColor(colorIndex)`, title line, sub line); `<tbody>` > one `<tr>` per row:
  `<th scope="row">` label + optional `<span>lower is better</span>`, then one `<td>` per column.
- Layout: `table`, `thead`, `tbody` are `display: block`; each `tr` is `display: grid` with inline
  `style={{ gridTemplateColumns: gridColumns(n) }}`; the `<table>` gets inline
  `style={{ minWidth: tableMinWidth(n) }}`. Inline styles (not CSS vars) so jsdom tests can assert
  them with `toHaveStyle`.
- Because changing `display` on table elements strips native table semantics in some engines
  (notably WebKit, historically Chromium), every element also carries its explicit role:
  `table` role="table", `thead`/`tbody` role="rowgroup", `tr` role="row", header `th`
  role="columnheader", row `th` role="rowheader", `td` role="cell". If oxlint reports
  `jsx-a11y/no-redundant-roles`, add one file-level
  `/* oxlint-disable jsx-a11y/no-redundant-roles -- display:grid/block strips native table roles in some browsers */`
  at the top of `CompareTable.tsx` only. Do not edit `.oxlintrc.json`.
- Value cell: `<td>` right-aligned (`justify-content: flex-end`) with a `.value` span (Geist Mono
  17px/500, `white-space: nowrap`). Best: `<Pill>{text}</Pill><span className={srOnly}> (best)</span>`
  so the cell's accessible name is e.g. "4,000 (best)". Plain: `<span className={plain}>` (padding
  `3px 9px`, `#111`). N/A (`value == null`, including missing key): `<span aria-hidden="true"
  className={na}>—</span><span className={srOnly}>not applicable</span>`; accessible name "not
  applicable" (AC14). Use `NULL_PLACEHOLDER` for the glyph, `formatStat` for values (AC13), and
  `bestIndex(values, def)` per row (AC15).
- Scroll region: `<div role="region" aria-label="Comparison table" tabIndex={0}
  className={scroll}>` wrapping the table (border `1px var(--color-border-alt)`, radius 12,
  `overflow-x: auto`). Arrow-key scrolling is native browser behaviour for a focused scroller; no JS
  handler. Focus ring: global `:focus-visible` (2px `--color-focus`, offset 2px); do not set
  `overflow` on any ancestor so the outline is not clipped. If oxlint reports
  `jsx-a11y/no-noninteractive-tabindex`, add a single-line disable with the reason "WCAG 2.1.1:
  scrollable region must be keyboard focusable".
- Caption: `<p className={caption}>Black = best among selected · — = not applicable to position</p>`
  after the scroll region inside a flex column with gap 10 (AC18, A11). The table's accessible name
  comes from `aria-label` (A7).
- A `.srOnly` class local to `CompareTable.module.css` (same rules as `App.module.css`).

Data and API changes: none to domain, provider, data or reducer. Only the additive ui props above.
Dependencies: none new.

## 4. Design

User flow: app opens on 3D (placeholder). User picks "Table" (click or arrow keys) to see the table;
adds/removes entities in the picker and stats in the sidebar and the table follows; switches
Players/Teams or season and the table updates in place; on "2D chart" chooses Bars or Radar and sees
the matching placeholder.

States:

| State | Table tab | 2D tab | 3D tab |
|---|---|---|---|
| Loading (selection non-empty, data pending) | nothing below tab row | Bars/Radar control, nothing below | 3D placeholder |
| Empty (`sel[kind]` empty) | EmptyState only | control + EmptyState | EmptyState + 3D placeholder |
| Error (provider rejects) | hooks yield `[]`; behaves as Loading (no crash, no empty message if selection exists) | same | same |
| Success | table + caption | control + Bars/Radar placeholder | 3D placeholder |

Styling values: exactly as listed in requirements "Design values to match" (tokens:
`--color-border-soft` tab row border, `--color-border-alt` table border and header bottom,
`--color-surface-subtle` header bg, `--color-divider` row border, `--color-text-muted`,
`--color-text-faint` note, `--color-text-na` dash, `#DADAD6` dashed empty border as a literal colour
since no token exists). Tab row: `display:flex; align-items:flex-end; justify-content:space-between;
flex-wrap:wrap; gap:16px; border-bottom:1px solid var(--color-border-soft)`. Pass
`className={styles.tabs}` to `Tabs` with `.tabs { border-bottom: 0 } .tabs button { padding: 0 0
10px }` so the design padding applies while the primitive keeps the colours and 2px underline.
Chart type wrapper: `margin-bottom: 8px`.

Widths: 1280px: body row fits, panel right of the 232px sidebar, 3-column table (580px min) fits
without scrollbar. 375px: panel wraps below the sidebar (existing `flex: 1 1 560px; min-width: 0`),
tab row wraps so the Bars | Radar control drops below the tabs, table scrolls inside its bordered
container; the page never scrolls horizontally because every ancestor has `min-width: 0`.

Accessibility: tab pattern from the primitive (roving tabindex, arrows, Home/End); hidden panels via
`hidden`; named group "Chart type" with `aria-pressed`; table with explicit roles and accessible
name; "best" and "not applicable" as visually hidden text; decorative dots `aria-hidden`; focusable
named scroll region with visible focus; placeholders are plain text (no live regions, no controls).
Colour contrast of `#9A9A95`/`#B5B5B0` is accepted as given (T18).

## 5. Risk and security

- Input validation: the only inputs are tab and button clicks dispatching typed actions; the reducer
  already ignores unchanged values. Entity names and meta are rendered as React text (escaped).
  Unknown entity ids and stat keys without defs are skipped (task T2).
- Auth / data exposure: none; mock data only, no network, no env vars.
- Failure modes and safeguards (concrete tasks):
  - Provider rejection: hooks already return `[]`; panel shows the loading state and does not crash
    (test in T6).
  - Duplicate App-level text matches if hidden panels rendered content: enforced by AC32 (test in T6
    and T8).
  - Native table roles stripped by grid CSS: explicit roles (T4) plus browser accessibility tree
    check (QA list, item 3).
  - Page-level horizontal scroll at 375px: `min-width: 0` on panel root and table wrapper column;
    QA items 5 and 6.
  - Lint warnings from redundant roles / tabindex: scoped disable comments with reasons (T4), never
    config changes.
  - Regressions in existing tests: only the AC3 assertion changes (T7); all others must pass
    untouched.

## 6. Gaps check

- Auth: not applicable (no accounts). Validation: covered above. Error handling: provider failures
  degrade to loading state (AC31). Mobile: 375px wrap and in-container scroll (AC2, AC7, AC25, AC26).
  Accessibility: section 4 (AC5 to AC7, AC14, AC15, AC19, AC20, AC27). Config and env vars: none
  added; `.env` untouched. Tests: section 7 and AC29. League neutrality: AC28 guard test.

## 7. Ordered tasks

Each task is one commit; run `npm run lint`, `npm run typecheck`, `npm test` before each.

- T1 (AC7, AC6, A10, A12): ui primitives, additive. `SegmentedControl` `size?: 'md' | 'sm'`;
  `Tabs` `className?`; `TabPanel` `hidden?`. Add new tests in a new file
  `web/src/components/ui/ui.size.test.tsx` (small variant class applied, `hidden` attribute set,
  className merged). `ui.test.tsx` unchanged.
- T2 (AC9, AC10, AC17, AC21): `compareTable.ts` helpers + `compareTable.test.ts` (sel order,
  skipped ids keep other colour indices, canonical row order with unsorted input, keys without def
  dropped, `tableMinWidth(3) === 580`, `tableMinWidth(8) === 1230`, `gridColumns(3)` exact string,
  `headerLines` both modes).
- T3 (AC8, AC22, AC28): `ChartPlaceholder`, `EmptyState` + CSS modules, `index.ts`, and
  `noLeagueLiterals.test.ts` for the compare folder (copy the sidebar test structure: `?raw`
  imports of every compare source file incl. `compareTable.ts` and `index.ts`, same literal list,
  "planted literal" check, no `/data/` import, no `MockProvider`; assert `ComparePanel.tsx` contains
  `useEntities` and `useStatDefs`).
- T4 (AC13 to AC21): `CompareTable` + CSS module per section 3 (explicit roles, inline grid /
  min-width, pills, N/A, note, compact headers, scroll region, caption).
- T5 (AC4 to AC8, AC22, AC23, AC31, AC32): `ComparePanel` + CSS module (tab row, control, panels,
  state switching).
- T6 (AC29, AC31, AC32): component tests `CompareTable.test.tsx` and `ComparePanel.test.tsx` with
  fixtures (see test notes below).
- T7 (AC1, AC3): mount in `App.tsx`; the one deliberate edit in `web/src/App.sidebar.test.tsx`:
  - Title: `'AC22: the Stats sidebar and the empty Stat views region are inside main'` becomes
    `'AC22: the Stats sidebar and the Stat views region are inside main'`.
  - Line 31 old: `expect(panel).toBeEmptyDOMElement()`
  - New: `expect(within(panel).getByRole('tablist', { name: 'View' })).toBeInTheDocument()`
  - Justification: T10 deliberately fills the region (the ticket's purpose); the old assertion
    encoded the T09 placeholder state. The new assertion still checks the region exists inside
    main and now checks it hosts the panel. No other line in this or any other existing test
    changes.
- T8 (AC1, AC11, AC12, AC16, AC17): `web/src/App.compare.test.tsx` integration with the real
  MockProvider (test files may use league names): region contains tablist as first descendant
  with role tab list (`panel.querySelector('[role]')` has role `tablist`); select Table; 3 column
  headers + "Stat" and 6 row headers for Players and for Teams; Teams default shows "lower is
  better"; season change changes at least one cell; adding a player via picker to 5 switches headers
  to short names.
- T9 (AC24 to AC27, AC30): `npm run build`, browser QA (list below), fix-ups only.

Parallel work: once section 3 signatures are fixed, the test-writer can write T2's
`compareTable.test.ts`, T3's `noLeagueLiterals.test.ts`, T6 and T8 tests and the fixture file in
parallel with the coder doing T1, T4, T5. Only T7 needs both sides (it touches App.tsx and the
existing test together).

Test notes for the test-writer:

- New fixture file `web/src/test/compareFixtures.ts` (do not modify `fixtureProvider.ts` exports;
  importing from it is fine). Invented keys only, e.g. defs for players: `zhigh` (higher better,
  `decimals: 0`), `zlow` (`lowerIsBetter`, `decimals: 2`), `zsign` (`signed`, `decimals: 1`),
  `zsolo` (only one entity has a value), `zbig` (values >= 1000 for thousands separators); groups
  ordered so canonical order differs from the `stats` array order. Eight or more players with
  values giving: a tie on `zhigh`, a null on `zhigh` that must not be pilled, smallest value pilled
  on `zlow`. Teams with a `lowerIsBetter` stat.
- Render pattern as in `StatSidebar.test.tsx`: `DataSource` + `AppStateProvider` with fixture
  defaults/defs; start on Table by clicking the "Table" tab (default view is `3d`).
- Queries: `getByRole('table', { name: 'Selected players compared by stat' })`,
  `getAllByRole('columnheader')`, `getAllByRole('rowheader')`, `getByRole('cell', { name: '4,000
  (best)' })`, `getAllByRole('cell', { name: 'not applicable' })`, `getByRole('region', { name:
  'Comparison table' })` with `toHaveAttribute('tabindex', '0')` and `.focus()` then `toHaveFocus()`.
  For header text use `within(header).getByText(...)` (jsdom concatenates title and sub without a
  space). Count pills with `within(row).queryAllByText(/\(best\)/)` and `toHaveLength(n)`.
- Min-width: `expect(screen.getByRole('table')).toHaveStyle({ minWidth: '1230px' })`; grid:
  `toHaveStyle({ gridTemplateColumns: gridColumns(8) })` on a row.
- Hidden panels: `getAllByRole('tabpanel', { hidden: true })` has length 3; each tab's
  `aria-controls` equals one of their ids; non-selected have the `hidden` attribute and are empty.
- oxlint: no message argument to `expect`, no `expect` inside `if`/ternaries/loops with conditions
  (use `it.each` or arrays compared with `toEqual`), every test has at least one visible `expect`
  (an `await findBy...` alone is not enough; wrap it in `expect(...).toBeInTheDocument()`).

QA browser-check list (`npm run dev`, Chrome and, if available, Firefox; DevTools device toolbar):

1. 1280px, default 3 players, Table tab: panel right of sidebar; table has no horizontal scrollbar;
   columns not squashed; best pills and "—" render; caption below table (AC2, AC24, AC18).
2. 1280px, Teams: 3 team columns with division/record meta; "lower is better" note on that row;
   same structure and caption (AC12, AC16).
3. Accessibility tree (Chrome DevTools Accessibility pane, Firefox Accessibility inspector): table
   named "Selected players compared by stat"; rows, column headers, row headers and cells keep their
   roles; region "Comparison table" focusable; tabs/tabpanels linked (AC19, AC20, AC6).
4. Add players to 8 (picker) at 1280px: headers switch to short name + badge at the 5th; table
   min-width 1230px (inspect computed style); scrolls inside its bordered box; last column reachable
   by mouse wheel/drag and by focusing the region and pressing ArrowRight; page has no horizontal
   scrollbar (`document.documentElement.scrollWidth === clientWidth` in console). Remove back to 4:
   headers revert (AC17, AC21, AC25).
5. 375px, default 3: panel wraps below the sidebar at full content width; table scrolls in its box;
   values and pills stay on one line; no page horizontal scroll (AC2, AC26).
6. 375px, 8 entities: same as item 4 with touch-emulated swipe inside the table; page does not
   scroll sideways (AC25).
7. 375px, 2D tab: Bars | Radar control wraps under the tabs, does not overflow; toggling switches
   placeholder text (AC7, AC8).
8. Keyboard only from page load (no mouse): Tab through nav, picker and sidebar to the tab list
   (focus lands on the selected "3D chart" tab); ArrowLeft/Right/Home/End switch views; on 2D, Tab
   reaches "Bars" then "Radar", Enter/Space toggles; on Table, Tab from the tab list reaches the
   scroll region and arrows scroll it; Shift+Tab goes back; focus ring always visible and not
   clipped; no trap (AC5, AC7, AC20, AC27).
9. Remove all players: empty-state box "Add a player to start comparing." under the tab row on all
   three tabs (3D placeholder below it on 3D); no table or caption; Teams shows "Add a team ..."
   (AC22).
10. Change season with the table visible: values update without reload (AC11).

## 8. Open questions (none block; defaults apply)

1. Q1 (AC17): show jersey number in compact headers? Needs a new optional domain field. Default:
   `badge`.
2. Q2: open on Table instead of 3D while 3D is a placeholder? Default: keep `3d`.
3. Q3: kind-neutral caption for Teams ("not applicable" without "to position")? Default: design text.
4. Q4: hide the 3D placeholder in the empty state? Default: show it (design).
5. Q5 (new): if oxlint flags the explicit table roles or the scroll region `tabIndex`, is a scoped
   disable comment acceptable long-term, or should `.oxlintrc.json` gain a rule option? Default:
   scoped file/line disable with reason; no config change.
