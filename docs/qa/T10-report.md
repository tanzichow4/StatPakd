# QA report: T10 compare panel, tabs and Table view

Branch `ticket/T10-compare-panel-and-table`, dev server `npm run dev` on http://localhost:5173/. Driven with playwright-core and the installed Chromium at 1280x900 and 375x900. Console: no errors or warnings at either width (only the React DevTools info line). Network: no failed requests or 4xx/5xx responses.

## Failures

### F1 (HIGH): the page scrolls sideways because of the table (fails AC25, AC26, and the "page does not scroll sideways" part of AC24-AC27)

Steps (375px): open the app, click "Table" (default 3 players). Evaluate `document.documentElement.scrollWidth`.
Expected: equals `clientWidth` (375). The table scrolls only inside its bordered container.
Actual: `scrollWidth` is 592 against `clientWidth` 375. The header bar is visibly cut at 375px in the full-page screenshot. With 8 entities `scrollWidth` is 1242 at 375px and 1506 at 1280px (`clientWidth` 1280). Teams at 375px is also 592. 3D chart and 2D chart tabs are fine (375/375), and 1280px with 3 entities is fine (1280/1280).

Cause (observed in the DOM): the visually hidden spans (`._srOnly_...`, "not applicable" and " (best)") are `position:absolute`. The scroll container (`section[aria-label="Comparison table"]`, `overflow-x:auto`) is not a containing block (it is `position:static`). The absolutely positioned spans therefore escape its clip and extend the document's scrollable area. The spans' right edges are at 592px at 375px. Every element in the table that is outside the viewport but inside the container is correctly clipped, so only these spans leak. A likely fix is `position:relative` on the scroll container or the table cell. I did not edit source.

Consequence when using the keyboard: focus the "Comparison table" region and press ArrowRight repeatedly. The region reaches its maximum scrollLeft, then scroll chaining scrolls the whole page sideways (375px, 3 entities: region 263, page scrollX 217; 1280px with 8 entities: region 272, page scrollX 226). The header bar, entity cards and tabs slide off screen (see the 1280 8-entity focus screenshot). Pressing ArrowRight does reach the last column, but the page moves with it.

### F2 (LOW, observation): compact header repeats text for Teams

With 5 to 8 teams the header reads "KC / KC", "DET / DET", and so on, because a team's `shortName` and `badge` are both the abbreviation (see Assumption A4 and open question Q1). This follows the spec as written. It is a UX nit for the human to decide on.

## Passed criteria

- AC1: region "Stat views" is inside `main`, after the "Stats" sidebar, with the "View" tablist first. Only one such region exists.
- AC2: at 1280px the panel is at x=292, width 960, to the right of the 232px sidebar (x=28). At 375px the panel wraps below the sidebar at x=28, width 319 (full content width).
- AC4: tablist "View" with Table, 2D chart, 3D chart in that order. On first load "3D chart" is selected (A6).
- AC5: Tab from the sidebar lands on the selected tab only (roving tabindex: others are -1). ArrowRight and ArrowLeft move focus and selection. Home and End work. I did not test ArrowRight wrapping from 3D chart to Table, or ArrowLeft wrapping from Table to 3D chart, explicitly. The visible panel followed every selection change.
- AC6: each tab's `aria-controls` resolves to a `role="tabpanel"` whose `aria-labelledby` points back to the tab. Non-selected panels have `hidden` and no children. Ariasnapshot shows only the selected panel.
- AC7: "Chart type" group with Bars and Radar appears only on 2D. `aria-pressed` follows `chart2`. Click, Enter and Space all toggle. It is absent on Table and 3D. At 375px it wraps under the tabs (tabs 199.5px + control 112.5px + 16px gap does not fit in 319px), with no page overflow. Computed styles match the design: track `#F2F2EF`, radius 7, padding 2, margin-bottom 8; items 12px/600, padding 4px 12px, radius 5; active white with shadow `0 1px 2px rgba(0,0,0,.1)` and `#111`; inactive `#7A7A75`.
- AC8: 2D shows "Bars chart — coming soon" or "Radar chart — coming soon", switching with the control. 3D shows "3D chart — coming soon". Placeholders have zero interactive elements.
- AC11: Players and Teams switch in place and the tab stays on Table. Changing the season updates values (Teams 22.6 became 18.6 for the first cell) without a reload.
- AC12: Players default has 3 columns x 6 rows. Teams default has 3 columns (Kansas City Chiefs "AFC West · 15–2", and so on) x 6 rows. The structure is the same for both.
- AC13: formatting is correct: thousands separators (3,731), "+6" and "+7" for signed stats, one decimal.
- AC14: N/A cells show "—" in `rgb(181,181,176)` (`#B5B5B0`) with no pill. Accessible name "not applicable".
- AC15: best cells show a black pill. Lower-is-better pills the smallest ("Pts Allowed / G" 19.2). Ties pill both ("Win %" 88.2 and 88.2). N/A is ignored. A row with one non-null value ("Pass Yds") has no pill. A single selected entity (Teams) has no pills in any row. Pill computed style: bg `#111`, white text, Geist Mono 17px/500, padding 3px 9px, radius 6.
- AC16: "lower is better" note appears only on "Pts Allowed / G" (Teams): 11px, `#9A9A95`. I did not add a lower-is-better stat to Players, which the spec says is possible.
- AC17: 1 to 4 entities show full name and meta. 5 to 8 show `shortName` and `badge` ("J. Allen / QB"). Adding the 5th switches every header. Removing back to 4 switches them back (checked at both widths).
- AC18: caption "Black = best among selected · — = not applicable to position" is below the table, 12px, `#7A7A75`, 10px gap (flex column gap 10px; scroll region bottom 617, caption top 627).
- AC19, real-browser accessibility tree (Chromium `ariaSnapshot`): `table "Selected players compared by stat"` (Teams: "Selected teams compared by stat"), `rowgroup` x2, `row`, `columnheader`, `rowheader` and `cell` roles all survive the CSS grid layout (`display:grid` rows, `display:block` table/thead/tbody). The explicit `role` attributes are present.
- AC19 accessible names in the real browser: a best-value cell is "2,005 (best)", with a space (jsdom gave "4,000(best)"). N/A is "not applicable". Rowheader with a note is "Pts Allowed / G lower is better", spaced. Column header is "Josh Allen BUF · QB · #17", spaced.
- AC20: region "Comparison table" is a `<section aria-label>` with `tabindex="0"`. It receives focus after the view tab. The focus ring (keyboard focus) is 2px solid `rgb(47,95,208)` and is not clipped (see the 1280px screenshot). ArrowRight and ArrowLeft scroll it (+40px per press at 8 entities; ArrowLeft goes back).
- AC21: rows have `grid-template-columns: minmax(170px, 1.3fr) repeat(n, minmax(0px, 1fr))`. Table `min-width` is 580px at n=3, 1230px at n=8. Entity columns are equal width (222.8px at 1280/n=3; 132.3px at n=8).
- AC22: with all entities removed, "Add a player to start comparing." (Players) and "Add a team to start comparing." (Teams) appear on Table, 2D and 3D. No table or caption is rendered. Box: padding 60px 20px, centered, 14px `#7A7A75`, 1px dashed `rgb(218,218,214)` (`#DADAD6`), radius 12. On 3D the placeholder still appears below the message (allowed by A5). On 2D the Chart type control remains.
- AC23: not exercised directly because the mock provider resolves instantly; no empty-state flash was seen on load or on kind switch.
- AC24: at 1280px with 3 default players the table fits (scroll region scrollWidth 958 = clientWidth 958), with no horizontal scrollbar. Columns are 289.6 / 222.8px, not squashed. The page does not overflow (1280/1280).
- AC25 (container part only): with 8 entities the table is 1230px wide inside a 958px (1280) or 317px (375) bordered container, `overflow-x:auto`. The last column is reachable by keyboard (scrollLeft reached its max, 272 at 1280 and 913 at 375). The page-level part fails (F1).
- AC26 (container part only): at 375px with 3 entities the table keeps 580px and scrolls in its container. Values and pills are `white-space:nowrap` and single line. Page-level part fails (F1).
- AC27: keyboard walk from the page start reaches NFL, Players, Teams, Season, the Remove buttons, Add player, the sidebar controls, then the selected tab. Arrows switch views. Tab from Table reaches the "Comparison table" region. Tab from 2D reaches Bars then Radar. After the last control focus leaves the document (no trap). Shift+Tab goes back through the region to the tab. A visible focus ring is present on every stop (white ring on the dark header, blue elsewhere). At 375px the region is below the fold when focused, so the browser scrolls it into view as normal.
- Header and row styling matches the design: header row bg `#FAFAF8`, bottom border `#E6E6E3`; "Stat" 11px/600 uppercase, letter-spacing 0.88px (.08em), `#7A7A75`, padding 14px 18px, bottom aligned; entity cell padding 14px 18px; title 14px/600 nowrap, gap 8; 8px round dot using series colours (`#111`, `#E0472B`, `#2F5FD0`, `#14946A`, `#D9921A`, `#7B4FC9`, `#1A9AA8`, `#D6457F`); meta 12px `#7A7A75`; body row border `#F0F0ED`, items centred; row header padding 12px 18px, flex baseline gap 8, wrap; value cell padding 9px 18px, right aligned. Table wrapper border 1px `#E6E6E3`, radius 12. Tab row: flex, flex-end, space-between, border-bottom `#E8E8E5`, gap 16, wrap; tabs 14px/600, padding `0 0 10px`, active `#111` with 2px underline, inactive `#8A8A85`.
- Sidebar: unchecking a stat removed its row and its sidebar entry. Not re-added in this run (the sidebar moves unchecked stats to "Add stat"); canonical order was not independently re-verified here.
- Teams kind with 8 teams: compact headers, min-width 1230px, page scrollWidth 1280 at 1280px (the F1 leak needs hidden spans beyond the viewport, which at 1280px with Teams happened not to trigger).
- Bad input, refresh and back: reload resets state to defaults (3D tab, Players, 3 players), no crash; there is no history navigation to test (Back leaves the app). No console errors after reload.

## Not tested

- Firefox and WebKit (only Chromium was available).
- Touch-swipe emulation on the table (keyboard and programmatic scroll only).
- A lower-is-better stat on Players (not added via the sidebar menu).
- AC28 to AC30 (code and test criteria; no source or tests were run or edited).

RESULT: FAIL
