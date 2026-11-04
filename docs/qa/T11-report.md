# T11 Bars chart: browser QA report

Branch ticket/T11-bars-chart, dev server `npm run dev` (Vite, http://localhost:5173). Stopped after testing.

Tooling note: the Playwright MCP browser could not start (Chrome not installed at the configured path). I drove the bundled Playwright Chromium 1248 through standalone Node scripts instead. These were scratch scripts and no source was edited. Screenshots were reviewed at 1280px and 375px.

## Failures
None found.

## Observations (not failures)
- The app opens on the "3D chart" tab by default (pre-existing, outside T11). The 3D tab shows "3D chart — coming soon" as before.
- The stat row is a flex layout, not literally `grid 160px minmax(0,1fr)`. Measured geometry matches the design: 160px label, 20px gap, 110px name, 16px track, 70px value.
- The chart type Bars/Radar control exposes two tab stops (pre-existing control). The chart itself adds none.
- Mock names are short (`J. Allen`, `A. St. Brown`), so ellipsis truncation could not be provoked with real data. CSS is correct: 110px width, nowrap, overflow hidden, `text-overflow: clip` (computed). Note that `clip` is reported rather than `ellipsis`. The computed value may come from the span rather than the name column, so it is worth a unit check or a visual check with a long name. I could not trigger it, so AC19 ellipsis is only partly verified. Severity: low.
- The equal-range case (AC10) cannot be produced with mock data and was not browser-verified.
- Empty stat selection could not be tested (stat chips have no remove control).

## Passed criteria
- AC1: 2D with Bars, selection and data shows the chart (group "Bars chart"), with no "coming soon" text.
- AC2: Radar shows "Radar chart — coming soon" and no chart or caption. Bars brings the chart back.
- AC3: Table and 3D tabs are unchanged. With no selection the 2D tab shows "Add a player to start comparing." with no chart or caption.
- AC4: One row per resolved stat, in canonical order, headed by its label. Players: 6 rows by default and 7 with Interceptions added. Teams: 6 rows.
- AC5: "lower is better" appears only on Interceptions and Pts Allowed / G.
- AC6: Lines are in selection order, with the series swatch, shortName, track and value. Swatches use `var(--series-N)` by index.
- AC7: Values are formatted like the Table (3,731; 22.6; +6; -1; 88.2).
- AC8: The caption "Bar length scaled to league range." appears once, below the last row. It is 12px, rgb(122,122,117), with 10px top padding.
- AC9: Widths come from the pool range. Allen's Pass Yds is 44% with only 3 selected; with Burrow selected it is still 44%. Pool min 2903 (Hurts) and max 4918 give 44%, which matches. Interceptions: pool min 4 gives 5%, max 12 gives 100%, and the largest and smallest selected values are strictly inside the range where appropriate.
- AC11: Interceptions are not inverted (4 gives 5%, 12 gives 100%). Teams' Pts Allowed / G is likewise not inverted (SF 25.6 gives 100%).
- AC12: Switching season (2024, 2023, 2022) and Players/Teams updates values and widths without a reload (Pass Yds 3,731, then 3,474, then 3,266). Removing an entity leaves the other bars' widths unchanged (44% before and after).
- AC13: N/A shows "—" in rgb(181,181,176) (#B5B5B0), has no fill element, and keeps the empty track and name column. Lines stay aligned.
- AC14: N/A exposes sr-only "not applicable", and the "—" is aria-hidden.
- AC15: The chart is a group labelled "Bars chart". Each row is a group labelled by its stat label ("lower is better" is included where it applies). Each line is an `li` with the name, a ": " separator and the value or "not applicable".
- AC16: Swatch and track are aria-hidden, and the name is always visible.
- AC17: There are 0 focusable elements in the chart. Tab goes from the 2D tab to Bars to Radar and then out of the panel, unchanged.
- AC18 (1280px, 3 players): label column 160, name 110, track 16 high with `#F3F3F0` and radius 3, value 70 in Geist Mono 13px right-aligned. Row gap 20, padding 14px 0, border 1px `#F0F0ED`, line gap 12, bars gap 6, head gap 2. Swatch 8x8 with radius 2. Label 14px/500, name 12px/600. scrollWidth equals clientWidth (1280).
- AC19: With 8 entities every row has 8 lines, and the layout is intact with no overflow. The track and value stay in place (checked for all 56 lines, 0 misaligned). See the ellipsis caveat above.
- AC20 (375px, 3 and 8 entities, Players and Teams): scrollWidth equals clientWidth (375) in all four cases. The label stacks above the bars (A6 default). Track width is 115px in every line, and values are fully inside the viewport (right edge 347).
- AC21: Players and Teams have identical structure and style.
- Console and network: 0 console errors or warnings, 0 page errors, 0 failed requests or HTTP 4xx/5xx across all flows.
- Refresh mid flow: the app reloads cleanly to its defaults (no persistence, no errors). Back navigation had no history entries (no routing).
- AC22-AC25 (source, tests, lint, build) were out of scope for the browser pass and were not run here.

RESULT: PASS
