# QA report 2: T18 responsive and accessibility (round 2)

Branch `ticket/T18-responsive-and-a11y` at 568ea7f (working tree clean). Existing dev server on :5173 reused (served current code).
Driven through `playwright-core` with cached Chromium; axe-core 4.14 injected with all rules (41 ran, including `color-contrast`).
Widths 375x667, 768x1024, 1280x800. No source or tests edited.

## Failures

None blocking. The two round 1 failures are fixed. Residual low-severity findings below are not blocking.

### R1 (Low, non-blocking): 3D axis label vs name tag bbox overlap when many entities are selected
- Steps: 375px, Teams, 3D chart, add teams until 8 selected, default axes.
- Expected: no text overlap.
- Actual: "Z · Turnover Diff" bbox overlaps the "PHI" tag by 15x2 px. In the screenshot nothing is obscured or unreadable
  (tag sits just above the label). Players with 8 selected and default axes: no overlap at 375/768/1280.
- With 8 selected and non-default axes, label/tag bbox overlaps appear at all widths including 1280 (for example
  "X · Rush Yds" vs "S. Barkley", 56x6 px at 768/1280 for "X · Pass TD" vs "L. Jackson"). This is data-positioned tag
  collision at every width, not the 375px label wrapping from F2; consistent with the deferred name-tag collision (T14).
  Default 3 entities: zero overlaps at all widths, Players and Teams.

### R2 (Info): Teams radar with 4 axes, label sticks out of chart box slightly above the compact breakpoint
- Steps: 481px, 768px or 1024px, Teams, 2D, Radar, uncheck last 2 stats (4 axes). "Pts Allowed / G" is 1px (768), 2px (1024)
  and 12px (481) outside the chart box on the left. No ancestor has overflow clipping and it stays inside the viewport, so
  it renders fully visible (screenshot checked). Not present at 375 or 1280. Outside the scope of the F1 fix.

## Round 1 fixes verified

### F1 radar label vs ring vertex at 375: FIXED
Outer-ring vertices read from the SVG (`getScreenCTM`), tested against each label bbox. Players and Teams, 6, 5, 4 and 3 axes
(stats unchecked from the end): zero labels contain a vertex, zero labels overlap the ring polygon, zero label/label
overlaps, zero clipped labels. Nearest label to a vertex is 6.2 px at worst (5 axes), 9 to 10.4 px elsewhere. "Pts Allowed / G"
with 6 axes (the F1 case): 9 px clear. Visual check of the 5-axis Teams radar: all labels readable.

### F2 3D axis labels at 375: FIXED for default and selected entities
Players and Teams, default selection (3): no overlap among axis labels, name tags and hint; all axis labels inside the card.
Players with 8 selected, default axes: clean. See R1 for the residual Teams case.

### No regressions at 768 and 1280
Radar, Players and Teams, 6/5/4/3 axes: no vertex containment, no ring overlap, no label overlap (except R2). 3D default and
8-selected: clean except R1. Gap from labels to vertices grew with width (8.9 to 22 px).

### axe-core, all rules, 375 and 1280: PASS
Players and Teams, Radar, 3D default, and 3D with 8 selected: 0 violations of any impact (no serious or critical).
`color-contrast` passed on 48 to 146 nodes per view. Incomplete (manual review only): `color-contrast` (3D overlay text over SVG)
and `label-content-name-mismatch` (card remove buttons), same as round 1.

### No page horizontal scroll at 375: PASS
`scrollWidth == clientWidth` (375, 768, 1280) on every radar and 3D state checked, including 8 selected.

### Console and network: PASS
No console warnings or errors, page errors, failed requests or HTTP >= 400 across all runs at all widths.

## Not rechecked this round
Criteria not touched by the fix (AC3, AC6 to AC9, AC11 to AC15, bad input, empty states) passed in round 1 and were not re-walked.
The Chart3D/Radar fix commit does not touch those components.

RESULT: PASS
