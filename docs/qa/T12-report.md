# QA report: T12 2D Radar chart (branch ticket/T12-radar-chart)

Method: Vite dev server (`npm run dev`), bundled Playwright Chromium via scratch scripts, 1280px and 375px, Players and Teams (NFL). The Playwright MCP could not start (Chrome missing).

## Failures

### F1 (minor, 375px only): wrapped axis labels, "Pts Allowed / G" overlaps the chart
- Steps: 375px viewport, Teams, 2D chart, Radar, default stats.
- Expected: labels per design are nowrap (12px/500). Labels should not overlap the chart (AC15 scopes this to the 1280px default size; AC16/A6 allow wrapping at 375px).
- Actual: labels near the container edge wrap onto 2 lines ("3rd Down %", "Turnover Diff", "Scrimmage Yds" on Players). Computed `white-space` is nowrap but the absolutely positioned width is limited by the box. "Pts Allowed / G" wraps to 3 lines under the bottom axis and its first line overlaps the outer ring bottom vertex and the dot. No clipping, no page scroll.
- Severity: minor (AC15 not violated; cosmetic at 375px).

## Observations (not failures)
- The task note said Teams default has 2 stats. In this build Teams default has 6 stats (Points / G, Yards / G, 3rd Down %, Pts Allowed / G, Turnover Diff, Win %), so the message does not show by default on Teams. The message was verified by deselecting stats on Players.
- Initial load shows the 3D tab; refresh resets to defaults (no persisted or URL state; Back leaves the app). Pre-existing, outside T12.
- Loading state not observable (mock data resolves instantly); unit tests only. No all-null entity exists in the default mock pool, so AC14 was exercised by choosing only passing stats with an RB and a WR.

## Passed
- AC1: Radar shows SVG, overlay labels, legend; no "coming soon" text.
- AC2: Bars/Radar toggle swaps charts, only one in the document at a time.
- AC3: Table, 3D placeholder, Bars and empty state ("Add a player to start comparing.") unchanged; no radar in empty state.
- AC4: 2 and 1 stats show "Pick at least 3 stats for the radar." with no SVG, polygons or labels.
- AC5: legend and caption still shown with the message.
- AC6: re-adding stats to 3 restores the chart without reload; removing back to 2 restores the message.
- AC7 (DOM check): rings and spokes match the model (t=1 vertices 260,60 / 389.9,135 / 389.9,285 / 260,360 for 6 axes, rings at 0.25/0.5/0.75/1). Unit tests not re-run.
- AC8/AC11 (spot): vertices consistent with pool range (pool max Rec Yds at 260,360).
- AC9: axes in canonical row order with row labels.
- AC10: one polygon with dots per entity, series colours match cards (#111, #E0472B, #2F5FD0). Computed styles match spec (fill-opacity .06, stroke 2px, round join, dot r3.5, white 1.5px stroke, rings/spokes #E6E6E2 1px; container flex gap 24px wrap; box flex 1 1 420px max 640px; legend col 0 0 200px).
- AC12: null values plot at 260,210 with the dot drawn.
- AC13: legend shows "Not applicable: <labels>" in axis order; none for entities with no missing values.
- AC14: all-null entities render points "260,210 ..." with no NaN anywhere.
- AC15: at 1280px, Players and Teams defaults, plus all 22 Players stats and all 13 Teams stats: no label clipped, no label-label overlap, no label inside the outer ring polygon. Visual check done.
- AC16: scrollWidth == clientWidth (375) with 3 and 8 entities, Players and Teams; legend wraps below chart; SVG scales (box 319px wide). See F1 for cosmetic wrap.
- AC17: 8 entities give 8 polygons and 8 legend entries for Players and Teams, same structure; 1280px scrollWidth == clientWidth too.
- AC18: group "Radar chart", SVG and overlay aria-hidden, text alternative lists each entity with stat labels and formatted values or "not applicable".
- AC19: legend shows full names next to colour bars.
- AC20: no focusable elements inside the radar; tab order Bars -> Radar -> out of panel unchanged; Enter on Radar switches chart.
- Lower-is-better inversion: Teams "Pts Allowed / G" KC 19.2 (y 335.2) > DET 20.1 (319.3) > BAL 22.2 (282.2); lower value plots further outward.
- Console: no errors or warnings in any run. Network: no failed or 4xx/5xx requests.
- AC21-AC24: not covered by browser QA (code, tests, build).

Screenshots: C:\Users\tanzi\AppData\Local\Temp\claude\6833e7c2c5b59d31\8081f4f3-3d05-4db1-a7e4-7b1af6b6b4dc\scratchpad\ (r_players_1280.png, r_teams_375.png, p8_*.png, t8_*.png, allp.png, allt.png)

RESULT: PASS
