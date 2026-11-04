# QA report: T14 3D chart, axes and readout

Branch `ticket/T14-3d-chart`, `npm run dev` on http://localhost:5199/. The Playwright MCP could not start (no Chrome), so I drove the bundled Chromium through playwright-core scratch scripts at 1280x900 and 375x900 (plus a touch-emulated 375x812 context). Console: no errors or warnings in any run. Network: no failed requests or 4xx/5xx responses. Source not edited.

## Failures

None blocking. No acceptance criterion failed.

### Observations (LOW, not failures)

- O1: At 375px the SVG scales to about 317px wide, but the HTML axis labels keep their 11px mono size, so with the default camera "Z · Scrimmage TD" is clipped at the card's left edge and "X · Rush Yds" at the right edge ("X · Rus"). This is the clipping AC36 deliberately accepts (it prevents horizontal page scroll); it is cosmetic. With 8 players selected the name tags also overlap each other (out of scope: no collision avoidance).
- O2: The mock pool is small (16 players, 8 teams), so AC41 on "the full league pool" is limited by the data available. See the stress test below.
- O3: A page refresh resets the tab, axes, selection and camera, as the requirements state (in-memory state only). Browser Back after load leaves the app, since there is no routing.

## Passed criteria

Panel and states
- AC1: the 3D tab shows controls row, chart card, then Readout; "coming soon" count is 0.
- AC2: the chart renders independently of the sidebar stat list (axes come from `ax[kind]`).
- AC3: with all players removed, 10 grey r4.5 dots, no name tags, no r7 dots, the four controls present (3 selects and Reset), and the Readout shows "Readout" then "Add a player to start comparing." with 0 cards.
- AC4: not directly reachable (no loading or failed-load state in the mock provider); covered only by unit tests. Not exercised in the browser.
- AC5: with Table or 2D active, 0 `3D chart` groups, 0 points and no Reset view in the DOM.

Axis selects
- AC6: selects X, Y, Z, accessible names "X axis", "Y axis", "Z axis"; 22 options each; current value shown.
- AC7: choosing Pass Yds for X updated the axis label ("X · Pass Yds"), the plot and the readout (Josh Allen 3,731 Pass Yds; Saquon "—").
- AC8: the same stat on X and Y is allowed.
- AC9: Players axes (X Pass Yds changed) persisted after switching to Teams (Points / G, Pts Allowed / G, Turnover Diff) and back.
- AC10: not reachable from the UI (no disabled "Choose a stat" option present, 0 disabled options). Not exercised in the browser.

Reset
- AC11: click, Enter and Space each restore the default camera; axes and selection unchanged; focus stays on the button.

Chart card and drawing
- AC12: card is 1px #E6E6E3, radius 12, white, overflow hidden; SVG viewBox 600x460 fills the card width (658x504 at 1280, 317x243 at 375).
- AC13: 20 grid lines (#EDEDE9, 1px), 12 cube edges (#DADAD5, 1px), 3 axis lines (#111, 1.5px).
- AC14: unselected r4.5 fill #C9C9C4, drop line #E0E0DC; selected r7 with series colours (#111, #E0472B, #2F5FD0 ...); white 1.5px circle stroke; drop lines dashed "3px, 3px", 1px.
- AC15: all r7 circles come after all r4.5 circles in DOM order (checked with 3 and 8 selected).
- AC16: name tags use shortName, 12px/600, #111, rgba(255,255,255,.85), padding 0 3px, radius 3, translate (0,-50%), left/top in percent.
- AC17: axis labels positioned in percent (top clamped to 10/460 = 2.2%); translate -100% when anchor x is below 300, otherwise 0.
- AC18: hint at bottom-left (12px #7A7A75, left 12px, bottom 10px).
- AC19: SVG and overlay are `aria-hidden`; overlay and tags have `pointer-events: none`.
- Design handoff geometry (visual comparison of screenshots with the design description): points, labels and name tags look consistent with the design.

Drag
- AC20, AC21: mouse drag rotates; after release further moves do not change the camera; cursor is `grabbing` while dragging.
- AC22: a drag that leaves the card keeps rotating (pointer capture); right button does not start a drag.
- AC23: `touch-action: none`, `user-select: none`, cursor `grab`. Touch emulation (CDP touch events, 375px mobile context): touch drag rotates the plot, the page does not scroll, a second drag works.
- AC24: pressing the plot focuses it and shows no focus ring (outline style none for mouse focus).

Keyboard
- AC25: `tabindex=0`, `role=group`, name "3D chart", described by the hint plus "Use arrow keys to rotate, Home to reset."
- AC26: ArrowRight/Left and ArrowDown/Up change the camera in the right directions; Shift is 5x (5 plain Left steps undo one Shift+Right); pitch clamps at both ends (40 and 60 presses, then 10 more change nothing); Home resets.
- AC27: no page scroll on handled keys; Shift+Tab moves focus back to Reset view; Tab works.
- AC28: keyboard focus ring is 2px solid #111 with 2px offset.
- AC29: tab order is X axis, Y axis, Z axis, Reset view, 3D chart (both widths).
- AC42 (Ctrl/Alt + arrows not handled): the camera does not change.

Readout
- AC30, AC31: h2 "Readout" (11px/600 uppercase, 0.88px spacing, #8A8A85); one card per selected entity in selection order with swatch, full name, and X/Y/Z cells (letter, value, stat label).
- AC32: "—" shown for N/A (Josh Allen Rec Yds); the entity is still plotted at the floor and still has a card.
- AC33: readout is a `ul role=list` of plain text, entity name then cells.

Layout
- AC34: at 1280 the chart column and the 280px Readout sit side by side (card x 292-952, readout x 972-1252, 20px gap); at 375 the Readout is full width (319px) below the chart.
- AC35: the controls row wraps at 375 (X and Y on one line, Z and Reset on the next, Reset right-aligned); selects 138px.
- AC36: `scrollWidth == clientWidth` (1280/1280 and 375/375) on the 3D view for Players with 3 and 8 selected, and Teams with 3 and 8 selected, also after rotating with Shift+arrows, and in the empty-selection state.

Quality
- AC37, AC38, AC39, AC40: not re-run here (unit tests, lint, typecheck and build were out of scope for this browser pass).

Other views
- Table (7 rows), 2D Bars and 2D Radar still render and work at 1280 and 375, with no page-level horizontal scroll and no console errors. Returning to 3D works.

## AC41 drag smoothness (manual measurement)

Headless Chromium on this Windows machine, 1280px, dev server, 240 scripted mouse moves during a drag, frame times from `requestAnimationFrame`:
- Real pool (16 players, 11 drawn at default): average 5.6 ms per frame, p95 5.7 ms, max 11.2 ms (about 180 fps, no dropped frames at 60 fps). Cost from pointermove dispatch to the next frame: p50 5.5 ms, p95 10.3 ms, max 15.1 ms.
- Stress test (400 extra cloned point groups appended to the SVG, about 36x the real pool, DOM-only so React work is not scaled): average 7.0 ms, p95 11.2 ms, max 22.3 ms. Pointermove-to-frame p50 12.9 ms, p95 15 ms, max 18.9 ms. Still within a 16.7 ms budget at the median; p95 is borderline.
- Touch drag in mobile emulation works. Not measured on a real device or a production build (dev build used), so the PR note should say so.

Verdict for AC41: smooth with the available mock pool.

RESULT: PASS
