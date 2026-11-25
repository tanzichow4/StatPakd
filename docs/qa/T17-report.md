# T17 QA report: Sortable roster table

Branch ticket/T17-roster-table. Dev server `npm run dev` (http://localhost:5173), Chromium via Playwright scripts (the Playwright MCP could not start: Chrome not installed). Viewports 1280x900 and 375x800. Scripts are in the session scratchpad.

## Failures

None found.

## Observations (not failures)

- Real mock data has no null stat values, so null handling was verified by rewriting the `mockProvider.ts` module response in the browser (route interception; no source edited). Injected: null, missing key, NaN, ties, an all-null column, an all-zero column, a one-player roster and an empty roster.
- The app has no URL routing or persistence: refresh returns to Players mode, and Back leaves the app (about:blank). Not part of the T17 ACs.
- Compare mode tabs in this build are Table / 2D chart / 3D chart (no separate Bars/Radar names). They were unchanged and showed no roster section.
- Defense rosters for some teams have 5 players (e.g. DET); the table renders them correctly.

## Passed criteria

- AC7 placement and caption: the order is chips, header card, Share of production, then Roster. The h2 is 18px/600. Caption text is exact (U+00B7), 12px, rgb(122,122,117). The gaps between heading, table and caption measure 8px.
- AC8: roster section absent in Compare mode (all three tabs) and in Players mode. Present only in Team breakdown. Empty roster (injected) renders the header row with no body rows and no errors.
- AC9: `table` role with `aria-labelledby` -> "Roster", and `aria-describedby` -> caption text. Rows, columnheader, rowheader and cell roles are present.
- AC10: Offense columns are Snap %, Touches, Targets, Scrim Yds, TD, Yds / Touch. Defense columns are Snap %, Tackles, Sacks, INT, Pass Def, Forced Fum. No Takeaways column.
- AC11: row order is correct for all 48 combinations of 8 teams, 3 seasons and 2 units.
- AC12-AC13: every stat header holds a button, and the arrow is `aria-hidden`. The Player header is not a button and has no `aria-sort`. The sorted th has `aria-sort` descending or ascending, and the other stat ths have "none".
- AC14: sorted header shows the arrow in #111. Unsorted headers are rgb(122,122,117) with no arrow.
- AC15: first click sorts desc, second asc, third desc. A new column starts desc. Enter and Space both work on header buttons.
- AC16: the single Offense/Defense toggle (one instance on the page) switches columns and rows and resets to Snap % desc, even from another column or from ascending. Clicking the already-active unit keeps the sort. Team and season changes keep the sort.
- AC3/AC4/AC11 in the DOM: ties keep roster order in both directions (Targets 101/101: Smith before Goedert in desc and asc). Injected null, missing and NaN rows go last in both directions, in original relative order. A sort on an all-null column leaves roster order.
- AC17: right-aligned values. Grouping (1,066, 2,283) and Yds / Touch with one decimal (4.2, 0.0). `%` appended on Snap % only. Null shows "—" with hidden "not applicable". No NaN/undefined/null/Infinity text anywhere.
- AC18: mini bar is 72x4, radius 2, track #EDEDE9, fill #111, `aria-hidden`, and the fill width equals the value. Null gives an empty 0% track. Bars appear only in the Snap % column.
- AC19-AC20: automated check over all 48 tables confirmed pills match max > 0, with ties all pilled, independent of sort. No pill for all-null or all-zero columns. A one-player roster gets pills. Pill style is #111 background, white text, padding 2px 8px, radius 5px. A visually hidden "team leader" is present.
- AC21: 10x10 swatch with radius 2. The swatch colour equals the Share legend colour for each player and is independent of sort. Name is 14px/600 nowrap. Meta line is 12px #7A7A75, for example "QB · #1".
- AC22: container border 1px #E6E6E3 with radius 12 and `overflow-x: auto`. Grid is `minmax(220px,1.6fr)` followed by `minmax(96px,1fr)` per stat column. Table min-width 820px. Header bg #FAFAF8 with bottom border #E6E6E3. Header padding 12px 18px, 11px/600 uppercase, letter-spacing .08em (0.88px). Row border #F0F0ED. Player cell padding 10px 18px, stat cell padding 8px 18px. Values are Geist Mono 15/500. All match design_handoff_statpakd lines 178-188.
- AC23: at 375px, for all 8 teams and both units, the page scrollWidth equals clientWidth, the region scrolls internally (820 / 317), and the heading and caption stay within the viewport. The region has `role=region`, `aria-label="Roster table"` and tabindex 0. Shift+Tab from the first header reaches it, and ArrowRight scrolls it.
- AC24/AC25: Share of production, header card and compare table are visually and textually unchanged. The toggle works as before.
- Keyboard: Tab reaches each header button with a visible 2px outline. Enter activates the sort.
- Console and network: no console errors or warnings, no page errors, and no failed or 4xx/5xx requests across all walks at both widths.
- AC1-AC6 and AC26-AC27 (pure sort, data contract, tests, lint/typecheck/build) were not run, as the scope was browser QA. The sort behaviour they describe was verified indirectly in the DOM.

The dev server was stopped at the end of the run.

RESULT: PASS
