# QA report: T18 responsive and accessibility

Branch `ticket/T18-responsive-and-a11y` (working tree had uncommitted edits to `AxisControls.module.css`,
`touchTargets.picker.test.ts`, `touchTargets.sidebar.test.ts`; QA ran against the working tree). Dev server
`npm run dev` in `web/`, http://localhost:5173/. The Playwright MCP could not launch (no Chrome), so I drove the
cached Chromium 1248 through `playwright-core` scripts in the session scratchpad. axe-core 4.14.0 was injected
with all rules (including `color-contrast`) on every view. No source or tests were edited. Widths 375x667,
768x1024, 1280x800.

## Failures

### F1 (Low/Medium): AC4, Teams radar at 375px, "Pts Allowed / G" label box contains an outer-ring vertex
- Steps: open 375x667, click Teams, tab "2D chart", toggle "Radar" (default team stats, default selection KC/DET/BAL).
- Expected (AC4): no axis label's bounding box contains an outer-ring vertex.
- Actual: label "Pts Allowed / G" (wraps to 3 lines) has bbox x 159.4-215.6, y 633.2-675.2. The bottom outer-ring
  vertex is at (187.5, 639.4), i.e. 6px inside the box. Visually the "Pts" line starts immediately under the vertex and
  the data dot for the leading series sits next to it. Other 5 labels: no intersections, none clipped, all inside the chart box.
  Players radar (6 labels) passes.

### F2 (Low/Medium): AC2, 3D chart at 375px, axis label overlaps name tag and drag hint
- Steps: 375x667, Players, tab "3D chart" (default camera, default selection).
- Expected (AC2): no text overlaps other text.
- Actual: the "X · Rush Yds" axis label wraps onto two lines at the card's right edge and its bbox overlaps the
  "S. Barkley" name tag (27x16px) and the "Drag to rotate · gray dots = rest of league" hint (7x5px); "Z · Scrimmage TD"
  overlaps the "J. Allen" tag (25x3px). In the screenshot part of the X label is hidden behind the tag. Teams 3D: X label
  overlaps the hint by 7x5px. All labels are inside the card (AC5 passes). Name-tag collision was deferred (T14), but
  the axis label is the thing being obscured here. At 768 and 1280 there is no overlap.

### Observations, not failures
- Outside click does not close the Add popover (1280, click at far right). Not covered by any AC.
- Page state (selection, kind, tab) does not persist across reload; browser Back leaves the app (no routes). Unknown
  paths such as `/nonexistent` render the normal app. Not covered by any AC.
- `docs/a11y.md` exemption list omits the 1280 popover position chips (26px) and add-stat menu items (31px). Both are
  under 40px at 1280 only.
- axe "incomplete" (needs manual review, not violations): `color-contrast` on 3D axis labels and name tags and the
  3D chart group because they sit over an SVG, and `label-content-name-mismatch` on the card remove x buttons.

## Passed criteria

### AC19 axe, all rules, 375 and 1280: PASS (0 violations of any impact)
Views: Players Table, Bars, Radar, 3D; Teams Table, Bars, Radar, 3D; empty state (Players and Teams); Add popover
open (Players and Teams); add-stat menu open (Players and Teams); Teams breakdown Offense and Defense. 16 views x 2
widths, zero serious or critical violations (zero violations at all). axe ran 41 rules, with `color-contrast` passing on 75 nodes.
Console warnings/errors, page errors, failed requests and HTTP >= 400: none, at any width, across the whole run.

### AC1 no page horizontal scroll: PASS
`scrollWidth == clientWidth` on every view at 375, 768 and 1280. Compare table and roster table scroll inside their
own containers (compare table scrollWidth 580 in 317 at 375). Both receive keyboard focus and have names ("Comparison table"
section, "Roster table" region). Roster sort buttons beyond the viewport at 375/768 are inside that scroller, not page overflow.

### AC2 no clipped or overlapping controls/labels: PASS except F2
Interactive-element bbox overlap checks across all views at 3 widths found only the Add popover overlaying page
content (expected). Sidebar sits above main at 375. Text-leaf overlap and clipping checks: clean at 768 and 1280, and
at 375 except F2 (the "Stat" header vs team name hit in the Teams table is a sticky-column bbox artefact, not visible).

### AC3 Add popover at 375: PASS
Popover bbox (8,8)-(367,659) fits the 375x667 viewport, Players and Teams. Results list scrolls inside it. Document
height unchanged on open (1884 -> 1884, 1926 -> 1926). At 768 and 1280 the popover is 360px wide with results
max-height 340px (measured 340).

### AC5 3D axis labels at 375: PASS
All three labels (Players and Teams) lie fully inside the chart card.

### AC6 touch targets at 375 and 768: PASS
On all 16 views at both widths, no button, tab, segmented control, select, search input, chip, add-stat button, menu item,
roster sort button, nav control, remove x or stat-checkbox label is under 40px in either dimension (share segments excluded as exempt).

### AC7 desktop unchanged at 1280: PASS
Measured sizes match `docs/a11y.md`: Players/Teams switch 29px, remove x 26x26, Compare/Breakdown switch 31px, team chips
31px, Done 38px, stat rows 32px, season select 33px, popover 360 wide / 340 results. Doc gap noted above.

### AC11 share rows one Tab stop: PASS
Offense: 4 rows, 27 segments, 4 Tab stops in the share section (one per row). Defense: 4 rows, 19 segments, 4 stops.
Same at 375 and 1280. Arrow keys move between segments.

### AC12 tooltip over keyboard-focused share segment: PASS
Every segment reached with Tab then ArrowRight (Offense 27, Defense 19, both widths): tooltip visible every time, and its horizontal
centre lies inside the focused segment, or the tooltip is clamped to the share track edge (still inside the card)
when the segment is near an edge or narrower than the tooltip. No unclamped tooltip was off-centre.

### AC13 visible focus indicator: PASS
2px solid outline with 2px offset on all control types. #2F5FD0 on white 5.72, on #FAFAF8 5.48, on #F2F2EF 5.10, on
#111 3.30. White ring in the dark nav: 14.4 to 18.9 against the nav surfaces (verified in a screenshot of the Players
button). Share segments show the blue ring plus an inset white ring (ring against the white inset is above 5:1). Focus
screenshots checked for nav button, remove x, checkbox, share segment. Tab, select, chip, add-stat button, scroll regions
and the 3D chart group (ink #111 ring, 18.9) were measured by computed style.

### AC8/AC9 keyboard-only operation, 1280 and 375: PASS
Done with keyboard only at both widths: Players/Teams switch (Enter, Space); season select changed with ArrowDown
(2024 -> 2023) and back; tablist ArrowLeft/Home/End moves selection; 3D X axis select changed with ArrowDown
(rushYds -> rushTd); 3D rotated with arrow keys (labels move); Reset view; stat checkbox Space; add-stat menu opens
with focus on its first item, add stat, Escape returns focus to the "Add stat to ..." button; Add popover opens with
focus in search, typing filters, QB chip filters 17 -> 7, Add and Remove from inside the popover (focus stays in popover),
Done and Escape both return focus to the Add card; card x removal moves focus to the next card's x, then the previous
card's, then the Add card when the last one goes. Focus was never on `<body>`. At 8 of 8 the Add card is replaced and focus stays on a card remove button.

### AC15 live region: PASS
One `<output aria-live="polite">` is present and empty at load. Announcements: "Lamar Jackson added", "Lamar Jackson removed"
(popover), "Josh Allen removed" (card x), "Pass TD removed" and "Pass Yds removed" (checkbox), "Pass Yds added" (menu). Season
change and kind switch announce nothing. Same at both widths.

### Bad input and empty states: PASS
Search with no-match text, markup, regex characters, 500 characters, emoji, whitespace only (shows all 17),
padded and upper-case names: "No matches." or correct results, no errors, no horizontal overflow. Empty state renders
at both widths for Players and Teams. Reload mid-flow returns to the default view with no popover and no errors.

## Not checked
AC10 DOM order was only spot-checked through the Tab walks (order matched visual order). AC17, AC18, AC22, AC23 are
unit-test and build checks outside this browser pass.

RESULT: FAIL
