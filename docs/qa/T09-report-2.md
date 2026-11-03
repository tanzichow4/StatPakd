# T09 re-QA report: stat sidebar and Add stat menu (after F1 fix)

Method: `npm run dev` in web/ (http://localhost:5173), headless Chromium driven by playwright-core at 1280x900 and 375x900. Clicks used real mouse input (`mouse.move`, `mouse.down`, `mouse.up`), not `element.click()`. Console errors/warnings, page errors, failed requests and HTTP >= 400 were captured: none at either width.

## F1 re-test: FIXED (1280 and 375)
With a menu open, one real click on another group's Add button closes the first menu and opens the second. Only one menu (and one `aria-expanded=true`) at any time. Focus lands on the first item of the new menu.
- Rushing -> Receiving (below): pass
- Rushing -> Totals (below): pass
- Totals -> Passing (upward): pass
- Receiving -> Rushing (upward): pass
- Passing -> Totals (below): pass
- Same group's button toggles closed on one click, and reopens on the next: pass

## Regression checks (both widths): all pass
- Outside click on empty page area and on a heading closes the menu. Focus falls to body (no programmatic focus, AC20).
- Escape from the open menu returns focus to that group's Add button.
- Pick lands in definition order. Rushing items were Rush TD, Yds / Carry, Carries, Rush Yds / G. Picking the last gave rows Rush Yds, Rush Yds / G. Then picking the first gave Rush Yds, Rush TD, Rush Yds / G. The new checkbox is focused and the menu closes.
- Last-stat lock: with one stat left (Rec Yds) the checkbox has `aria-disabled="true"`. Click and Space leave it checked, and it keeps focus. A group emptied while others have stats (Totals) keeps its heading and Add button.
- Players groups are Passing, Rushing, Receiving, Totals. Teams groups are Offense, Defense, Overall. A Rushing menu open before switching to Teams is closed after the switch. A Teams menu (Offense) open before switching back to Players is closed too.
- Keyboard only: Enter on Add opens the menu and focuses the first item. Enter picks, focus lands on the new checkbox (Interceptions), and Pass Yds, Pass TD, Interceptions stay in order. Tabbing through 21 focusable elements puts focus on body only once, at the end-of-document wrap, which is normal browser behaviour. Focus is never lost mid-flow.
- 375px: `scrollWidth` is 375 (no horizontal overflow). 1280: 1280.
- Console: no errors or warnings. Network: no failed requests.

## Failures
None.

## Not re-verified (same as previous report)
AC6 loading/failure/stale states, AC7 and AC26 are unit-test territory.

RESULT: PASS
