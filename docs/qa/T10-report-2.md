# QA report 2: T10 compare panel and Table view (re-run)

Branch `ticket/T10-compare-panel-and-table`, `npm run dev` on http://localhost:5173/. Driven with playwright-core and Chromium at 375x900 and 1280x900. No source edited. Dev server stopped afterwards.

## Verification of previous failures

### F1 (page scrolls sideways): FIXED
`document.documentElement.scrollWidth` equals `clientWidth` in every combination tested:

| Width | Kind | 3 entities | 8 entities |
|---|---|---|---|
| 375 | Players | 375/375 | 375/375 |
| 375 | Teams | 375/375 | 375/375 |
| 1280 | Players | 1280/1280 | 1280/1280 |
| 1280 | Teams | 1280/1280 | 1280/1280 |

`body.scrollWidth` matched too. Removing back to 3 entities stays at 375/375 and 1280/1280.

Keyboard: I focused the "Comparison table" region at 8 entities and pressed ArrowRight 60 times, 60 ms apart.
- The region reached its max scrollLeft (913 at 375, 272 at 1280).
- Page `scrollX` stayed 0 at both widths, so there was no sideways chaining.
- At 375 the page scrolled vertically (scrollY 1413) to bring the focused region into view, which is normal.
- ArrowLeft x60 returned the region to scrollLeft 0 and page scrollX stayed 0.

### F2 (repeated "KC / KC"): FIXED
- Teams with 8 entities show headers "KC", "DET", "BAL", "BUF", "PHI", "MIN", "GB", "SF", with no repeated sub line.
- Teams with 3 entities show full name plus meta, for example "Kansas City Chiefs | AFC West · 15–2".
- Players with 8 entities still show "J. Allen | QB" and so on. With 3 entities they show "Josh Allen | BUF · QB · #17".

## Spot checks that passed (both widths unless noted)
- Tabs are Table, 2D chart, 3D chart. First load selects 3D chart. Arrow keys and Home move selection and the panel follows.
- The Bars | Radar control appears only on 2D. 2D shows "Bars chart — coming soon" and "Radar chart — coming soon" when toggled. 3D shows "3D chart — coming soon" with no Radar control. Table has no control.
- Table semantics: `table` with rowgroups, `columnheader`, `rowheader` and `cell` roles survive in the accessibility tree. The table name is "Selected players compared by stat".
- Best value: 4 cells carry "(best)" with the default 3 players. N/A cells read "not applicable" and show "—" (6 of them). A row with one value has no pill. The caption "Black = best among selected · — = not applicable to position" is present.
- The table scrolls inside its container at 8 entities (keyboard-reachable last column) instead of squashing.
- Empty state: after removing all 3 players, "Add a player to start comparing." appears, with no table, and there is no page overflow.
- Reload resets to the defaults (3D tab) with no crash.
- Players and Teams switch in place. The Teams kind was exercised at 3 and 8 entities.

## Console and network
- No console errors or warnings at either width.
- Two `requestfailed` events for Google font files (`fonts.gstatic.com` Geist and Geist Mono woff2), seen only in the 1280 run where I called `reload()` mid-load. They are consistent with the reload aborting in-flight requests. They did not occur in the other runs and are not an app defect.
- No 4xx/5xx responses.

## Not tested
- Firefox and WebKit.
- Touch swipe.
- A lower-is-better stat on Players.
- Code and test criteria (component tests were not run).
- Pixel-level styling, which was previously verified in `docs/qa/T10-report.md` and was not re-measured.

RESULT: PASS
