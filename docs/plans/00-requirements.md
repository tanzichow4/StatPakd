# T14 requirements: 3D chart, axes and readout

Source ticket: `docs/tickets/T14-3d-chart.md` (its acceptance criteria are the contract).
Design references: `design_handoff_statpakd/README.md` lines 40-41; `design_handoff_statpakd/design/StatPakd App.dc.html`
markup lines 126-149 (controls row, SVG card, overlays, hint, Readout aside) and script lines 364
(`fmt`), 395-410 (grid, edges, axes, axis labels, points, name tags), 471-477 (`statOpts`, `axSel`,
`readout`, `resetView`, pointer handlers).
Merged building blocks to reuse (do not change their behaviour):
- `web/src/lib/projection.ts` (T13): `plotPoints`, `dragCamera`, `gridLines`, `cubeEdges`,
  `axisLines`, `axisLabelAnchors`, `DEFAULT_CAMERA`, `CENTER_X`, `YAW_PER_PX`, `PITCH_PER_PX`.
- `web/src/state/appState.ts` (T06): `ax` per kind, `yaw`/`pitch`, actions `setAxis`, `setCamera`
  (clamps pitch, ignores non-finite), `resetView`.
- `web/src/lib/stats.ts`: `formatStat`, `NULL_PLACEHOLDER` ("—").
- `web/src/components/compare/` (T10-T12): `ComparePanel` (3D tab currently renders
  `ChartPlaceholder` "3D chart — coming soon"), `resolveColumns`, `useEntities`, `useStatDefs`,
  `EmptyState`; `web/src/styles/series.ts` (`seriesColor`); `web/src/components/ui/Select.tsx`.

## Goal

Replace the 3D placeholder with the design's interactive SVG 3D scatter: three axis selects, a Reset
view button, the full league pool plotted with selected entities highlighted and named, drag and
keyboard rotation, and a Readout aside listing each selected entity's X/Y/Z values. The chart must be
league-agnostic, usable by keyboard and touch, and must not cause page-level horizontal scroll at
375px.

## Acceptance criteria

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

## Out of scope

- Changes to projection math, `plotPoints` filtering or sort, `dragCamera`, or reducer actions
  (T13/T06 own them); inverting lower-is-better stats in 3D.
- three.js / WebGL, zoom, pan, inertia/momentum, auto-rotate, or animation of Reset.
- Hover tooltips or click-to-select on points; name tags for unselected points; label collision
  avoidance between tags.
- Per-kind camera (the camera stays shared across players/teams, as in state).
- Persisting axes or camera beyond the in-memory app state (URL, localStorage).
- Team breakdown view; Table and 2D charts (unchanged apart from shared panel gating).
- Full responsive/a11y audit at 768/1280, axe sweep, contrast fixes for `#9A9A95`/`#B5B5B0` and
  40px touch targets (T18). T14 only guarantees AC34-AC36 at 375px.
- Removing `ChartPlaceholder` or its own unit tests.

## Assumptions

1. Empty selection: the design renders the 3D view regardless of selection (`is3d` is not gated on
   `has`), so the chart with grey league dots stays visible; the existing empty-state text moves into
   the Readout so the user still knows what to do (AC3).
2. "Fewer than the needed stats": 3D always has exactly three axes from `ax[kind]` (league defaults),
   independent of the sidebar stats, so the T10 `rows.length > 0` gate does not apply to 3D (AC2).
   The only "missing stat" case is an axis key with no definition, handled by AC10. Choosing the same
   stat on two axes is allowed, as in the design.
3. Loading and load failure are indistinguishable through `useEntities` (both give `[]`); 3D follows
   the 2D behaviour of rendering nothing until data is present (AC4). If a pool loads but no entity
   has all three values and nothing is selected, the cube draws with no points and no message.
4. Draw order follows the ticket ("depth sort plus selected last") over the design's pure painter
   sort; the drop line is drawn with its own point, so selected drop lines also sit above unselected
   dots.
5. Keyboard steps equal 10px of drag (yaw 0.1, pitch 0.08) so keyboard and drag feel the same;
   Shift multiplies by 5; Home resets. Arrow directions mirror the drag direction (ArrowRight acts
   like dragging right). These are not in the design and are my defaults.
6. `touch-action: none` on the plot follows the design. Consequence: a swipe that starts on the chart
   rotates rather than scrolls; on a 375px screen the chart is about 340 x 260px, leaving room above
   and below to scroll the page. Accepted.
7. Drag deltas are in CSS pixels, not viewBox units, matching the design (`clientX` deltas), so the
   rotation speed per finger movement is the same at every chart size.
8. The design ends the drag on `pointerleave`; with pointer capture that would end drags early, so
   release is pointerup, pointercancel or lostpointercapture instead (AC21-AC22). jsdom lacks
   `setPointerCapture`, so the call is guarded, as the design does with try/catch.
9. Focus/ARIA: the SVG and overlays are `aria-hidden`; the focusable wrapper is `role="group"`
   named "3D chart", matching the existing "Bars chart"/"Radar chart" group naming; the visible
   Readout is the text alternative, so no extra screen-reader list is added (unlike Radar, whose
   values are not otherwise visible). Camera changes are not announced (no live region).
10. Select labels: visible text "X"/"Y"/"Z" with accessible names "X axis"/"Y axis"/"Z axis"
    (label-in-name satisfied). Options are not grouped (the design has a flat list), in canonical
    order to match the sidebar.
11. Readout values use the shared `formatStat` (decimals and "+" sign per StatDef), matching design
    `fmt`; N/A uses the plain "—" text colour of the design's readout (no grey `#B5B5B0` override).
    The full `name` is used in cards; name tags use `shortName` (design `p.short`).
12. Narrow layout: the design's flex-wrap is kept, but the wrapped Readout spans the full width rather
    than staying 280px, and the chart card clips overflow so projected labels cannot cause horizontal
    page scroll (the design card does not clip; this is a deliberate deviation for AC36).
13. Pressing the plot focuses it (AC24) so keyboard users who also use a mouse can continue with
    arrows; this does not show a focus ring because of `:focus-visible`.
14. The camera stays shared between kinds and between tab switches because it is a single app-state
    field; Reset is the only way back to defaults besides the keyboard Home key.
15. Smoothness is a manual check (AC41). Dispatching `setCamera` per pointermove is acceptable; if the
    manual check shows lag the planner may batch to one update per animation frame without changing
    observable behaviour.
16. Existing ComparePanel tests asserting "3D chart — coming soon" (T10 AC8, T11/T12 AC3 checks, and
    the AC32 "no entity name on the default 3D view" check) describe superseded placeholder behaviour;
    updating them to the new 3D content is a behaviour change, not weakening a test.
17. A17 (autobuild): planner's open questions resolved by defaults: missing-stat readout cell label empty; AC42 (Ctrl/Alt/Meta + arrows/Home left to the browser) confirmed; Readout heading is h2; drag moves are not rAF-batched unless the manual check shows lag.

## Open questions

None blocking; all defaults recorded under Assumptions.

No blocking questions.
