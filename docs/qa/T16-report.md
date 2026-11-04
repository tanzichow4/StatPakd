# T16 browser QA report (share of production)

Branch ticket/T16-share-of-production. Playwright MCP could not start (no Chrome); used bundled Chromium via scratch Node scripts. Dev server started with `npm run dev` and stopped afterwards.

## Failures
None blocking.

Minor observations (not AC failures):
- The keyboard-focus tooltip is always anchored at the left edge of the bar (`left: 0`), not above the focused segment. It is never clipped (checked at 1280 and 375, all 27 offense segments, tooltip rect within viewport) but can sit far from the focused segment. Severity: low (cosmetic, T18/T20 territory).
- Hover uses the native `title` only, which the ACs allow.
- Page reload returns to Players mode (no URL/state persistence). This is existing app behaviour, not T16. After reload nothing throws.

## Passed (checked in the browser at 1280px and 375px, all 8 teams x Offense/Defense = 16 combos per width)
- AC9/AC10: Team breakdown shows chips, header card, then "Share of team production", subtitle and the Offense/Defense toggle. aria-pressed is true only on the active unit. The section is absent in compare mode.
- AC11/AC12: Toggle swaps rows, leaders and legend. Unit persists across team change, season change and a breakdown -> compare -> breakdown round trip.
- AC13/AC14: Grid computes to `150px 846px 150px` at 1280. Labels and totals read e.g. "Touches | 689 total" and "Scrimmage Yds | 4,736 total".
- AC15/AC16: Bars are 30px tall with 2px gap, track `rgb(243,243,240)`, radius 5, overflow hidden. Min segment width is above 3px (14px at 375). Percent text appears only on segments with pct >= 9 and never below.
- AC17/AC18: Leader text "Leader: Barkley 42%" for PHI Touches matches the segment. Segment percentages sum to exactly 100 in every row of every team, unit and width (read from DOM).
- AC19: No "NaN", "Infinity" or "undefined" text in any combination. A zero-total row cannot be produced from the mock data; covered by unit tests only.
- AC21/AC22/AC23: Tooltips read e.g. "Saquon Barkley · 378 (42%)". All 27 segments are Tab stops in roster order, row by row. The `role=tooltip` text is visible on focus and equals the accessible name. There is a 2px solid outline on focus. Bars have the accessible name "Touches share", etc. Hover `title` is correct.
- AC24/AC25: The legend lists 7 players in roster order with 10x10 swatches (radius 2px). Swatch colours are identical to segment colours (#111, #E0472B, #2F5FD0, ...).
- AC29: At 375px rows stack (label/total, bar, leader), grid is a single column, `scrollWidth == clientWidth` (375) for every team and both units. The toggle fits. At 1280, scrollWidth is 1280.
- Earlier views: Compare mode Table, 2D chart and 3D chart render (non-empty) after the round trip. The header card is unchanged. Visual style matches the design handoff in screenshots.
- Console: no errors or warnings. Network: no failed requests or 4xx/5xx.
- AC26-AC28, AC30-AC32 (unit-test and lint/build criteria) were not exercised in the browser. Not re-run here.

Screenshots and scripts are in the session scratchpad.

RESULT: PASS
