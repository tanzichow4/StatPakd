# Plan: T14 3D chart, axes and readout

Source: `docs/tickets/T14-3d-chart.md`. The contract is `docs/plans/00-requirements.md`: AC1 to
AC41 and assumptions 1 to 16. This plan runs without stopping for approval. The requirements list
no blocking questions, so every default under Assumptions applies.

## 1. Goal and out of scope

Goal: replace the 3D placeholder with the design's interactive SVG 3D scatter. It has three axis
selects, a Reset view button, the full league pool plotted with selected entities highlighted and
named, drag and keyboard rotation, and a Readout aside listing each selected entity's X/Y/Z values.
The chart must stay league-agnostic and work by keyboard and touch. At 375px it must not cause
page-level horizontal scroll.

Out of scope (from the requirements):
- Changes to the projection math, `plotPoints`, `dragCamera` or the reducer actions.
- Inverting lower-is-better stats in 3D.
- three.js or WebGL, zoom, pan, inertia, auto-rotate, and Reset animation.
- Hover tooltips, click-to-select, name tags on unselected points, and label collision avoidance.
- A separate camera per kind, and persisting axes or camera (URL or localStorage).
- The team breakdown view. Table and 2D stay as they are, apart from the shared panel gating.
- The full 768/1280 responsive and a11y audit, axe sweep, contrast fixes and 40px touch targets
  (all T18).
- Removing `ChartPlaceholder` or its own tests.

## 2. Acceptance criteria (copied from 00-requirements.md, same numbers)

Panel integration and states
- AC1: With the 3D tab active, entities and stat definitions loaded and at least one selected entity,
  the 3D panel shows (in order) the controls row, the chart card and the Readout aside; the text
  "3D chart — coming soon" is no longer rendered anywhere.
- AC2: The 3D chart does not depend on the sidebar's selected stats: it renders whenever the pool and
  stat definitions are loaded, even if the sidebar stat list would leave the Table/2D views without
  rows. Axis keys come only from `state.ax[kind]`.
- AC3: With an empty selection (and data loaded), the controls row and chart card still render, with
  every eligible league entity plotted as an unselected grey dot and no name tags; the Readout aside
  shows its "Readout" heading followed by the existing empty-state text ("Add a player to start
  comparing." / "Add a team to start comparing.") and no cards.
- AC4: While entities or stat definitions are not yet loaded (or failed to load, which `useEntities`
  reports as an empty pool), the 3D panel renders no SVG, no axis selects and no Reset button; with
  an empty selection it shows only the empty-state text (current behaviour), otherwise nothing.
- AC5: Hidden tab panels still render no content (T10 AC32): nothing from the 3D chart is in the DOM
  while Table or 2D is the active view.

Axis selects
- AC6: Three selects appear left to right with visible labels "X", "Y", "Z" (monospace) and
  accessible names "X axis", "Y axis", "Z axis". Each lists every stat definition of the current kind
  (label text, canonical order, same list for all three) and shows the current `ax[kind][i]`.
- AC7: Choosing a stat in a select dispatches `setAxis` for that index; the plot, the axis overlay
  label ("X · <stat label>", "Y · ...", "Z · ...") and the matching readout cell (value and stat
  label) update to the new stat.
- AC8: The same stat may be chosen on more than one axis (no de-duplication).
- AC9: Axes persist per kind: after changing X for players, switching to teams shows the teams' axes,
  and switching back shows the changed players' X again.
- AC10: If an axis key in state has no matching stat definition, that select shows a disabled
  "Choose a stat" option as its current value and the chart card shows the message
  "Pick a stat for each axis." instead of the SVG; the readout shows "—" for that axis.

Reset view
- AC11: A "Reset view" button sits at the right end of the controls row; activating it (click, Enter
  or Space) dispatches `resetView`, restoring yaw -0.65 and pitch 0.38, and the plot redraws at the
  default camera. It does not change axes or selection, and keyboard focus stays on the button.

Chart card and SVG drawing
- AC12: The chart card is a bordered card (`#E6E6E3`, radius 12, white) containing a 600 x 460
  viewBox SVG at 100% of the card width with preserved aspect ratio.
- AC13: The SVG draws, in this order: 20 floor/back-wall grid lines (`#EDEDE9`, 1px), 12 cube edges
  (`#DADAD5`, 1px), 3 axis lines (`#111`, 1.5px), then the points, all from the T13 helpers at the
  current camera.
- AC14: Every entity returned by `plotPoints(pool, ax[kind], sel[kind], camera)` is drawn as one dashed
  drop line (1px, dash 3 3) from the point to its floor foot, plus a circle with a white 1.5px stroke.
  Unselected: r 4.5, fill `#C9C9C4`, drop line `#E0E0DC`. Selected: r 7, fill and drop line in the
  series colour for its selection index (`seriesColor(selIndex)`).
- AC15: Draw order is all unselected points in back-to-front order, then all selected points in
  back-to-front order, so every selected circle is later in the DOM than every unselected circle
  (verifiable by DOM order in a test).
- AC16: Each selected point has an HTML name tag (the entity's `shortName`, 12px/600, `#111`,
  white 85% background, padding 0 3px, radius 3) absolutely positioned at
  left `(x + 10) / 600 * 100%`, top `y / 460 * 100%`, translated `(0, -50%)`.
- AC17: Three HTML axis labels "X · <label>", "Y · <label>", "Z · <label>" are positioned from
  `axisLabelAnchors(camera)` at left `x / 600 * 100%`, top `max(10, y) / 460 * 100%`, translated
  `(-100%, -50%)` when the anchor x is below 300, otherwise `(0, -50%)`. Percentages rounded to 1
  decimal as in the design.
- AC18: The hint "Drag to rotate · gray dots = rest of league" sits at the bottom left of the card
  (12px, `#7A7A75`).
- AC19: The SVG and the overlay labels are hidden from assistive technology; overlays do not capture
  pointer events (dragging over a name tag still rotates).

Drag rotation (mouse, pen, touch)
- AC20: Pressing the primary button / touching the plot area and moving updates the camera to
  `dragCamera(startCamera, dx, dy)` where dx, dy are CSS-pixel deltas from the press point (not
  scaled by the SVG's rendered size), dispatched through `setCamera`; the plot redraws during the
  drag.
- AC21: Releasing (pointerup), cancelling (pointercancel) or losing pointer capture ends the drag;
  further pointer moves without a press do not change the camera.
- AC22: The plot captures the pointer on press (when `setPointerCapture` is available), so a drag
  that leaves the card keeps rotating until release. Only one pointer drives a drag at a time;
  additional simultaneous pointers are ignored. Non-primary mouse buttons do not start a drag.
- AC23: The plot area has `touch-action: none` and `user-select: none`, so a touch drag on the chart
  rotates instead of scrolling the page. The cursor is `grab`, and `grabbing` while dragging.
- AC24: Pressing the plot area moves keyboard focus to it (so arrow keys work right after a click).

Keyboard rotation and focus
- AC25: The plot area is a single tab stop (`tabindex="0"`) with `role="group"`, accessible name
  "3D chart" and a description (via `aria-describedby`) that includes the visible hint plus
  "Use arrow keys to rotate, Home to reset." (the extra sentence may be visually hidden).
- AC26: When the plot has focus: ArrowRight adds 0.1 to yaw and ArrowLeft subtracts 0.1 (same
  direction as dragging right/left, 10px of drag); ArrowDown adds 0.08 to pitch and ArrowUp
  subtracts 0.08 (same direction as dragging down/up). With Shift held the step is 5 times larger.
  Pitch stays clamped to [-0.2, 1.3]. Home dispatches `resetView`.
- AC27: Handled keys call `preventDefault` (the page does not scroll); all other keys, including
  Tab and Shift+Tab, behave normally.
- AC28: The focused plot shows a visible focus indicator (2px `#111` outline on the card, offset so it
  is not clipped) only for keyboard focus (`:focus-visible`).
- AC29: Tab order within the 3D panel is X select, Y select, Z select, Reset view, plot.

Readout
- AC30: The Readout aside has the heading "Readout" (11px/600 uppercase, letter-spacing .08em,
  `#8A8A85`) and one card per selected entity that exists in the pool, in selection order.
- AC31: Each card shows a 10px series-colour square and the entity's full name (14px/600, ellipsis
  when too long), then three cells X, Y, Z, each with the axis letter (10px mono `#7A7A75`), the
  value formatted with `formatStat` for that stat (15px/600 mono) and the stat label (10px `#9A9A95`,
  ellipsis).
- AC32: A null or missing value shows "—" in its cell; a selected entity with a null axis is still
  plotted (at -1 on that axis, per T13) and still has a card.
- AC33: The readout is plain text in the accessibility tree (it is the text alternative for the
  chart); it is a list of entities or a list-like structure that a screen reader announces with the
  entity name followed by "X <label> <value>" style cells.

Layout and narrow screens
- AC34: At widths where both fit, the chart column (flex 1 1 520px, min-width 0) and the 280px
  Readout sit side by side with a 20px gap; below that they wrap and the Readout spans the full
  width under the chart.
- AC35: The controls row wraps; selects shrink to fit (no fixed min width forcing overflow) and
  Reset view stays right-aligned on its line.
- AC36: The chart card clips its overlays (labels and name tags that project outside the card do not
  extend the page), so at a 375px viewport there is no page-level horizontal scroll on the 3D view
  with the default selection and with 8 selected entities.

League-agnostic and quality
- AC37: No league-specific names in the new components or model; all labels, names and stat lists
  come from the DataProvider (the existing `noLeagueLiterals` test covers the compare folder).
- AC38: Pure layout helpers (overlay percentage/translate computation, draw-order split, keyboard
  step mapping) live outside components and have unit tests.
- AC39: Component tests cover: axis change (AC7, AC9), Reset (AC11), readout content including "—"
  (AC30-AC32), selected-after-unselected draw order (AC15), keyboard rotation (AC26-AC27), a simulated
  drag (AC20-AC21) and the empty/loading states (AC3-AC4). Existing ComparePanel tests that asserted
  the 3D "coming soon" placeholder are updated to the new behaviour, not deleted.
- AC40: `npm test`, `npm run lint`, `npm run typecheck` and `npm run build` pass.
- AC41 (manual): with the full league pool, dragging in a production build on a desktop browser
  feels smooth (about 60fps, no visible lag), and touch drag works in a mobile browser or device
  emulation; the result is noted in the PR description.

Added
- AC42 (added): Arrow keys and Home pressed together with Ctrl, Alt or Meta are not handled. They do
  not change the camera or call `preventDefault`, so browser and OS shortcuts such as Alt+Left
  (history back) keep working. Gap: AC26-AC27 did not cover modifier combinations, and handling
  them would break a platform shortcut.

## 3. Architecture

Approach: follow the T11/T12 pattern of a pure model plus thin components, all in
`web/src/components/compare/`. The model turns state and data into render-ready values (positions in
viewBox units and percentages, draw order, readout cells, key-to-action mapping). The components only
map those values to markup and attach handlers. The T13 `projection.ts` module is used unchanged.

New files (all in `web/src/components/compare/`)
- `chart3dModel.ts` and `chart3dModel.test.ts`. Pure, with no React and no DOM. It imports
  `projection.ts`, `stats.ts` (`formatStat`, `NULL_PLACEHOLDER`), `canonicalStatOrder` and
  `tableModel` (`CompareColumn`).
  - `CHART3D = { width: 600, height: 460 }`, `LABEL_MIN_Y = 10`, `NAME_TAG_DX = 10`,
    `KEY_STEP_PX = 10`, `SHIFT_MULTIPLIER = 5`. The 300 split threshold uses `CENTER_X`.
  - `pct(v, total)`: `Math.round(v / total * 1000) / 10`, giving a percentage with 1 decimal.
  - `axisDefs(axes, defs)` returns `[StatDef | undefined, x3]` by key lookup. `axesComplete(...)`
    is true when all three are defined (AC10).
  - `axisOptions(defs)` returns `SelectOption[]` (`value` = key, `label` = def label) in canonical
    order (AC6).
  - `axisLabelLayout(camera, defs3)` returns three `{ letter: 'X'|'Y'|'Z', text, left, top,
    side: 'before' | 'after' }`. Here `text` = `${letter} · ${label}`, `left` = `pct(x, 600)`,
    `top` = `pct(max(10, y), 460)`, and `side` is `'before'` when `x < CENTER_X` (AC17).
  - `nameTagPosition(point)` returns `{ left: pct(x + 10, 600), top: pct(y, 460) }` (AC16).
  - `drawOrder(points)` returns `[...unselected, ...selected]` and keeps the input (back-to-front)
    order inside each group. It does not mutate its input (AC15).
  - `cameraForKey({ key, shiftKey, ctrlKey, altKey, metaKey }, camera)` returns
    `{ type: 'setCamera', yaw, pitch } | { type: 'resetView' } | null`. Arrows compute
    `dragCamera(camera, dx, dy)` with dx/dy = ±10px (±50 with Shift), so the steps are 0.1 yaw and
    0.08 pitch and pitch stays clamped. Home returns `resetView`. Ctrl, Alt or Meta, and any other
    key, return `null` (AC26, AC27, AC42). The returned object is a valid `AppAction`, so the
    component dispatches it directly.
  - `readoutModel(columns, defs3)` returns one card per column in selection order:
    `{ entity, colorIndex, cells: [{ letter, label, text, na }] x3 }`. `text` is
    `formatStat(value, def)`, or `NULL_PLACEHOLDER` when the value is null or missing or the def is
    undefined. `label` is the def label, or `''` when the def is undefined (AC30-AC32, AC10).
  - `chart3dModel(pool, axes, selIds, camera, defs3)` returns `{ ok, grid, edges, axes, points,
    tags, labels }`. `ok` is `axesComplete`. When `ok` is false the geometry arrays are empty.
    `points` is `drawOrder(plotPoints(...))`. `tags` lists the selected points with `shortName` and
    position, resolved by an id-to-entity map. This one function is what the component memoizes.
- `AxisControls.tsx`, `AxisControls.module.css` and `AxisControls.test.tsx`. These hold the controls
  row: three labelled selects and the Reset view button. Props are `options`, `axes`, `onAxis(index,
  key)` and `onReset()`. There is no state access, so the component is easy to test in isolation.
- `Readout.tsx`, `Readout.module.css` and `Readout.test.tsx`. Props are `cards` and `kind`. The
  aside contains `<h2>` "Readout" (sidebar groups use h2), then either `<EmptyState kind>` or
  `<ul role="list">` with one `<li>` per card. Each `li` holds the name and three cells whose text
  reads "X Zlow 3.50"-style in DOM order (AC33).
- `Chart3D.tsx`, `Chart3D.module.css` and `Chart3D.test.tsx`. This is the panel body. It reads
  `useAppState()` for `ax[kind]`, `sel[kind]`, `yaw` and `pitch`, takes `pool` and `defs` as props,
  and renders `AxisControls`, the chart card and `Readout` inside a wrapping flex layout.

State wiring (no reducer changes; the T06 actions are reused as they are)
- Axis select change: `dispatch({ type: 'setAxis', index, key })`. The reducer already rejects
  unknown keys and no-ops on the same key. It is per kind, which gives AC9 with no extra code.
- Reset button and Home key: `dispatch({ type: 'resetView' })`.
- Arrow keys: `dispatch(cameraForKey(...))` when the result is not null, and only then call
  `preventDefault`.
- Drag: a `useRef<{ pointerId, startX, startY, start: Camera } | null>` plus a `useState` boolean
  `dragging` for the cursor class.
  - `onPointerDown`: ignore it if a drag is already active, if `!e.isPrimary`, or if this is a mouse
    with `button !== 0`. Otherwise store the start values, call `currentTarget.focus()` (AC24),
    `setPointerCapture?.(id)` inside try/catch (AC22) and `preventDefault()`.
  - `onPointerMove`: act only for the stored pointerId. Dispatch `setCamera` with
    `dragCamera(start, clientX - startX, clientY - startY)` (AC20).
  - `onPointerUp`, `onPointerCancel` and `onLostPointerCapture` for the stored id clear the ref and
    `dragging` (AC21).
  - The camera comes from state at press time, so a drag is relative to its start (T13 AC19).
  - One dispatch per move is enough. If the manual check (AC41) shows lag, coalesce moves with
    `requestAnimationFrame` (assumption 15). That changes no observable behaviour.
- `ComparePanel.tsx`: `loaded = entities.length > 0 && defs.length > 0`. The 3D branch is evaluated
  before the `hasSelection` and `ready` gates:
  - `view === '3d' && loaded` renders `<Chart3D pool={entities} defs={defs} />` (AC1-AC3).
  - `view === '3d' && !loaded && !hasSelection` renders `<EmptyState>` (AC4).
  - `view === '3d'` otherwise renders `null` (AC4).
  - The `ChartPlaceholder` import is removed. The file and its tests stay.
  - The Table and 2D branches are unchanged.

Shared UI change (additive, existing callers unaffected)
- `web/src/components/ui/Select.tsx` gets two optional props.
  - `placeholder?: string`. When `value` is not among the options, it renders a first
    `<option value="" disabled>{placeholder}</option>` and the select shows it (AC10).
  - `className?: string`, merged through `cx`, so the axis selects can set `min-width: 0;
    max-width: 100%` (AC35).
  - Tests are added in `ui.test.tsx`.

Data, API, config and dependencies: no DataProvider, type, reducer or env changes, and no new
dependencies. The SVG and pointer events are native.

## 4. Design

User flow: the app opens on 3D (the default view). The user sees the controls row, the cube with grey
league dots and coloured, named selected dots, and a Readout card per selected entity. Changing a
select redraws the plot, the axis label and the readout cell. Dragging, or using the arrow keys
after focusing the plot, rotates the cube. Reset view or Home restores the default angle. Switching
kind shows that kind's axes, and the camera is shared between kinds.

States
- Loading or failed (pool or defs empty): there is no SVG, select or button. With an empty
  selection, only the existing empty-state text shows. Otherwise the panel is empty, as in Table and
  2D today (AC4).
- Empty selection after load: the controls and chart (grey dots only, no tags) show, plus the
  Readout heading and empty-state text with no cards (AC3).
- Missing axis definition: that select shows the disabled "Choose a stat" option. The card shows
  "Pick a stat for each axis." with no SVG, overlays or hint. The readout cell shows "—" (AC10).
  Because the reducer only accepts known keys, this can only come from bad league defaults.
- Pool loaded but no entity eligible and nothing selected: the cube draws with no points and no
  message (assumption 3).
- Success: the full chart (AC12-AC19) and readout (AC30-AC33).

Desktop: the chart column (`flex: 1 1 520px; min-width: 0`) and a 280px Readout sit side by side
with a 20px gap (AC34). The controls row is `display: flex; flex-wrap: wrap; gap`, with the Reset
button pushed right by `margin-left: auto` (AC35).

Mobile (375px): the Readout wraps under the chart at full width (`flex: 1 1 100%` once wrapped, via
`flex: 1 1 280px; max-width: 100%` on a wrapping row, with `min-width: 0`). The selects shrink
(`min-width: 0`) and the label text ellipsizes. The card has `position: relative; overflow:
hidden` so projected overlays cannot widen the page (AC36). The SVG is `width: 100%; height: auto;
display: block`. `touch-action: none` and `user-select: none` apply only to the card (AC23).

Accessibility
- The focusable card is `role="group"`, `aria-label="3D chart"` and `tabIndex={0}`. Its
  `aria-describedby` points to the hint id plus a visually hidden span "Use arrow keys to rotate,
  Home to reset." (AC25).
- The SVG has `aria-hidden="true"` and `focusable="false"`. The overlay layer has `aria-hidden` and
  `pointer-events: none` (AC19).
- The focus ring is `.card:focus-visible { outline: 2px solid #111; outline-offset: 2px }`. The
  outline sits outside the card's own clip box, so `overflow: hidden` does not cut it (AC28).
- Tab order follows DOM order: X, Y, Z, Reset, plot (AC29). Each select sits in a `<label>` holding a
  visible mono letter and the `Select` with `label="X axis"`, so clicking the letter focuses the
  select (AC6).
- The Readout list is plain text, used as the text alternative (AC33). No live region (assumption 9).

## 5. Risk and security

- Input validation: axis keys come from state, which the reducer validates. A key in state with no
  definition is handled by AC10. Values go through `formatStat` and `normalize`, so null or missing
  values never produce NaN coordinates. `setCamera` ignores non-finite values and clamps pitch.
  Safeguard: model tests feed null and missing values and an unknown axis key, and assert no `NaN`
  in any position or percentage (T1, T2).
- Auth and data exposure: none. Everything is client-side, rendering data already on screen. Text is
  rendered as React text nodes, never as HTML.
- Failure modes and safeguards:
  - jsdom has no `setPointerCapture` or layout: guard the capture call with optional chaining and
    try/catch. Drag tests use `fireEvent.pointerDown/Move/Up` with `clientX/clientY`, `isPrimary`,
    `pointerId` and `button`. jsdom may drop unknown `PointerEvent` init fields, so T6 checks this
    first and defines a small `MouseEvent`-based helper in the test file if needed (T6).
  - Stuck drag (lost pointerup): handled by `pointercancel` and `lostpointercapture`, and a second
    pointer is ignored while a drag is active (AC21-AC22). Tested in T6.
  - Lint rules on interactive roles: oxlint jsx-a11y may flag `tabIndex`, `onKeyDown` or
    `onPointerDown` on `role="group"`. Use a scoped `oxlint-disable` comment with a reason, as
    `RadarChart.tsx` does, rather than changing the role. The AC25 role and name are required.
  - Performance with the full pool (AC41): memoize `chart3dModel` on `[pool, axes, sel, yaw, pitch,
    defs]`. Build the id-to-entity map once per pool. Use keys = entity id so React reuses nodes. The
    rAF fallback is above.
  - Existing tests that assumed a quiet 3D view now see entity names, stat labels, a button and
    comboboxes on the default view. Update them to the new behaviour, scoped and not weakened (T9,
    T10). Each superseded assertion is replaced by an equivalent one for the new content
    (assumption 16).
  - Duplicate text: with an empty selection the empty-state text must appear once, inside the
    Readout, not also above it. The existing "only the visible panel holds the message" test
    (`findAllByText` length 1) guards this.
  - League literals: new files are added to `noLeagueLiterals.test.ts`, and the fixtures use invented
    keys (T10).

## 6. Gaps check

- Auth: not applicable, since there is no network write and no user data.
- Validation: unknown axis keys (AC10), null and missing values (AC32), non-finite camera (the
  reducer) and modifier keys (AC42, added) are covered.
- Error handling: a load failure shows the loading state (AC4). The model never throws on typed
  input and is NaN-tested.
- Mobile: touch drag (AC20-AC23), wrap and clip at 375px (AC34-AC36), plus a manual check (AC41).
  The 768/1280 audit is T18.
- Accessibility: group role and name, description, focus ring, tab order, keyboard rotation, hidden
  decorative SVG and a text alternative (AC19, AC24-AC29, AC33).
- Config and env vars: none. `.env` is not touched.
- Tests: there are unit tests for each pure helper (T1, T2) and component tests for AxisControls,
  Readout and Chart3D (T4-T7). ComparePanel and App integration tests are updated (T8, T9). The
  literals test is extended (T10), and the full gate runs in T11.

## 7. Tasks

Each task is one commit with tests in the same commit. All paths are under `web/src/`.

- T1: Layout helpers in the model. Add `chart3dModel.ts` with `CHART3D` and the constants, `pct`,
  `axisLabelLayout`, `nameTagPosition` and `drawOrder`.
  - Tests in `chart3dModel.test.ts`:
    - `pct` rounding, e.g. `pct(310, 600) = 51.7`.
    - At `DEFAULT_CAMERA` the label left/top equal `pct` of `axisLabelAnchors`.
    - A y below 10 is raised to 10 (pick a camera where an anchor is above the top, e.g. pitch 1.3,
      and assert top = `pct(10, 460)`).
    - `side` is `'before'` exactly when x < 300 (check both sides with two cameras).
    - The name tag is offset by 10.
    - `drawOrder` puts unselected before selected, keeps relative order and leaves deep-frozen
      input unchanged.
  - Files: `components/compare/chart3dModel.ts`, `components/compare/chart3dModel.test.ts`.
  - ACs: AC15, AC16, AC17, AC38.
- T2: Keyboard mapping, axis resolution and readout model. Add `cameraForKey`, `axisDefs`,
  `axesComplete`, `axisOptions`, `readoutModel` and `chart3dModel`.
  - `cameraForKey` tests:
    - ArrowRight/Left give yaw ±0.1 and ArrowDown/Up give pitch ±0.08 (`toBeCloseTo`).
    - Shift gives ±0.5 and ±0.4.
    - Pitch clamps at 1.3 and -0.2.
    - Home returns `resetView`.
    - Ctrl, Alt or Meta with an arrow returns `null`, and Tab, Enter and letters return `null`.
  - `axisOptions` follows canonical order, not definition order (use the fixture's `zhigh`,
    `zlow`, `zbig` order).
  - `readoutModel` tests:
    - Cards come in selection order and skip ids missing from the pool.
    - `formatStat` text is used, with signed and decimals cases.
    - Null and missing values give "—" with `na: true`.
    - An undefined def gives "—" and `''`.
    - The same stat on two axes gives two cells.
  - `chart3dModel` tests:
    - `ok` is false and the geometry is empty when an axis def is missing.
    - Otherwise there are 20/12/3 lines, the points are in `drawOrder` order, and tags exist only
      for selected points, with `shortName`.
    - No NaN appears anywhere for an all-null stat.
  - Files: `chart3dModel.ts`, `chart3dModel.test.ts`.
  - ACs: AC6, AC8, AC10, AC14, AC26, AC27, AC30, AC31, AC32, AC38, AC42.
- T3: `Select` placeholder and className. Add the optional `placeholder` and `className` props as
  described in section 3.
  - Tests in `ui.test.tsx`:
    - With an unknown value the select's displayed value is the disabled placeholder option.
    - With a known value no placeholder option is rendered.
    - `className` is applied.
    - Existing Select tests stay unchanged.
  - Files: `components/ui/Select.tsx`, `components/ui/ui.test.tsx`.
  - ACs: AC10, AC35.
- T4: `AxisControls` component. Add the controls row with three `<label>` wrappers (a mono letter
  plus `Select` named "X axis" and so on, placeholder "Choose a stat") and the "Reset view" button,
  with CSS for wrapping, shrinking and the right-aligned Reset.
  - Tests:
    - The accessible names and visible letters are correct.
    - The options match the given list and are the same for all three selects.
    - The current values are shown.
    - Changing Y calls `onAxis(1, key)`.
    - The same key can be chosen on two selects.
    - Click, Enter and Space on Reset call `onReset`, and focus stays on the button.
    - Tab order is X, Y, Z, Reset.
    - An unknown axis value shows "Choose a stat".
  - Files: `components/compare/AxisControls.tsx`, `AxisControls.module.css`,
    `AxisControls.test.tsx`.
  - ACs: AC6, AC7 (dispatch side), AC8, AC10, AC11 (button), AC29 (partial), AC35.
- T5: `Readout` component. Add the aside with the h2 "Readout", the EmptyState when there are no
  cards, and otherwise a `ul role="list"` of cards: a colour square styled with `seriesColor`, the
  full name with ellipsis, and three cells (letter, value, label).
  - Tests:
    - The heading text is correct.
    - Cards come in the given order.
    - The cell text is correct, including "—".
    - The square uses the series var for its index.
    - The empty cards case shows the heading plus the player or team empty text and no list.
    - The list item's text reads the name followed by "X <label> <value>"-style cells (AC33).
  - Files: `components/compare/Readout.tsx`, `Readout.module.css`, `Readout.test.tsx`.
  - ACs: AC3 (readout part), AC30, AC31, AC32, AC33.
- T6: `Chart3D` component, covering drawing, state wiring, drag and keyboard. Render `AxisControls`,
  the card and `Readout`; wire `setAxis`, `resetView` and `setCamera` as in section 3. The card holds
  the SVG (grid, edges and axes in order, then the points in model order, each as a `<g>` with a
  dashed line and a circle), the overlay layer (axis labels, name tags), the hint, the hidden
  keyboard sentence, or the AC10 message. Add the CSS for card, focus ring, cursor, touch-action,
  clipping and the column layout.
  - Tests use an `AppStateProvider` with the compare fixtures and a state probe:
    - Line counts and colours, and `viewBox` "0 0 600 460".
    - Every selected circle follows every unselected circle in the DOM (AC15).
    - Radius and fill per type.
    - Name tags show shortNames at the model positions.
    - Axis labels read "X · Zhigh" and so on, with `aria-hidden` on the SVG and overlay.
    - Changing X updates the label, the readout label and value, and the circle positions.
    - Reset restores the default yaw and pitch and leaves `ax` and `sel` alone.
    - Arrow, Shift+Arrow and Home dispatch the expected camera, a handled key is
      `defaultPrevented` and Tab/Alt+Left are not.
    - A drag (down, move by 100/50, up, then move) gives yaw -0.65+1 and pitch 0.38+0.4. Moves
      after up and from a second pointerId change nothing. A right button press does not start a
      drag. pointercancel and lostpointercapture end the drag.
    - A press focuses the card.
    - The cursor class changes while dragging.
    - The group name and description are correct.
    - An unknown axis key in the defaults shows "Pick a stat for each axis." and no svg.
  - Files: `components/compare/Chart3D.tsx`, `Chart3D.module.css`, `Chart3D.test.tsx`.
  - ACs: AC7, AC10-AC28, AC34, AC36 (CSS), AC39 (component part).
- T7: `ComparePanel` wiring. Add the `loaded` flag and the 3D branch ahead of the `hasSelection`
  and `rows` gates, as in section 3. Remove the `ChartPlaceholder` usage. Export `Chart3D` from
  `index.ts` only if other compare components are exported there.
  - New ComparePanel tests:
    - The default view shows the controls, card and readout in DOM order, and no "coming soon"
      (AC1).
    - With `playerStats: []` the 3D chart still renders (AC2).
    - An empty selection shows the selects, card, Readout heading and empty text once, with no
      tags (AC3).
    - Pending and failed entity or def loads show no svg, combobox or Reset button, with the empty
      text only when nothing is selected (AC4).
    - On Table and 2D, no "3D chart" group or Reset button exists (AC5).
    - Changing X for players, going to teams (team axes shown) and back shows the changed X
      (AC9).
  - Files: `components/compare/ComparePanel.tsx`, `components/compare/ComparePanel.test.tsx`,
    `components/compare/index.ts` (if needed).
  - ACs: AC1, AC2, AC3, AC4, AC5, AC9, AC39.
- T8: Update the existing ComparePanel tests that described the placeholder, rewriting them for the
  new behaviour and deleting none. All are in `ComparePanel.test.tsx`.
  - "AC32: on the default 3D view no table, entity name or stat label is in the DOM" now asserts no
    table and no caption. The entity name and stat label appear only inside the 3D tabpanel.
  - "AC32: the placeholder text exists only in the selected panel" becomes: after switching to 2D,
    no "3D chart" group, "Reset view" button or "X axis" combobox is in the DOM.
  - "AC8: 3D shows the 3D chart coming-soon placeholder" becomes: the 3D view shows the "3D chart"
    group and no "coming soon" text.
  - "AC8: the placeholder has no controls of its own" becomes: the 3D panel's controls are exactly
    the 3 axis comboboxes, the Reset view button and no links.
  - "T11 AC3: the Table and 3D tabs show no Bars chart" and "T12 AC3: ... no radar" swap
    `findByText('3D chart — coming soon')` for `findByRole('group', { name: '3D chart' })`.
  - Also update the `compareDefaults` doc comment in `test/compareFixtures.ts` ("ax values are
    unused" is no longer true). Do not change the fixture data.
  - Files: `components/compare/ComparePanel.test.tsx`, `test/compareFixtures.ts`.
  - ACs: AC1, AC5, AC39.
- T9: Update the App-level tests for the new default view in `App.compare.test.tsx`.
  - "AC4: the app opens on 3D with its placeholder" becomes "with the 3D chart": find the group
    "3D chart" in the panel and expect no "coming soon".
  - "AC32: the default 3D view does not duplicate App-level text" stays the same idea, but scoped.
    The player name appears once in the picker card list and once in the Readout. A sidebar stat
    label appears once in the sidebar, and its other occurrences are inside the Stat views region.
    No table is rendered.
  - Run the other `App.*.test.tsx` files. Fix any query broken by the new duplicate text by scoping
    it with `within`, never by loosening it.
  - Files: `App.compare.test.tsx` (others only if they break).
  - ACs: AC1, AC39.
- T10: League-literal coverage. Add `chart3dModel.ts`, `AxisControls.tsx`, `Readout.tsx` and
  `Chart3D.tsx` as `?raw` imports to the `sources` map in
  `components/compare/noLeagueLiterals.test.ts`, plus a planted-literal check for `Chart3D.tsx` and
  `chart3dModel.ts`. Also check that `Chart3D.tsx` imports nothing from `data/`.
  - Files: `components/compare/noLeagueLiterals.test.ts`.
  - ACs: AC37.
- T11: Quality gate and manual checks.
  - Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run format` and `npm run build` in
    `web/`, and fix findings without weakening tests.
  - In the dev or preview build, check at 375px for no horizontal scroll with the default selection
    and with 8 selected (AC36), and the wrap layout (AC34-AC35).
  - With the full pool in `npm run build` + preview, check desktop drag smoothness and touch drag in
    device emulation. If it lags, apply the rAF coalescing in `Chart3D.tsx` and re-run the tests.
  - Record the results for the PR description.
  - Files: none expected (or `Chart3D.tsx` if rAF is needed).
  - ACs: AC36, AC40, AC41.

## 8. Open questions

None blocking. The defaults below are applied and can be changed at review.
1. AC10 readout label: when an axis has no definition, the readout cell shows "—" with an empty stat
   label. Should it show "Choose a stat" instead?
2. AC42 (added): Ctrl/Alt/Meta with arrows or Home is left to the browser. Confirm this is
   preferred over rotating.
3. Readout heading level: `<h2>`, matching the sidebar group headings. Confirm it fits the page
   outline (the only h1 is the hidden "StatPakd").
4. If the AC41 manual check needs rAF coalescing, a drag test may need `vi.useFakeTimers` or a rAF
   stub. Behaviour stays the same, but the test setup changes.
