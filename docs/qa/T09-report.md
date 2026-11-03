# T09 QA report: stat sidebar and Add stat menu

Method: `npm run dev` (http://localhost:5173), headless Chromium driven by playwright-core scripts at 1280x900 and 375x900. Mouse and keyboard-only passes. Console warnings/errors, page errors, failed requests and HTTP >= 400 were captured throughout: none at either width.

## Failures

### F1. Clicking a lower group's "Add stat" while an upper group's menu is open only closes the menu (medium)
Steps (1280 or 375, mouse):
1. Click "Add stat to Rushing" (menu opens inline).
2. Click "Add stat to Receiving" (or Totals), which sits below the open menu.

Expected (AC11, AC15, plan QA step 4): the first menu closes and the second opens. AC15 says the press does what the click target normally does.
Actual: the first menu closes and nothing opens. The outside `pointerdown` closes the menu, the layout shifts up (Receiving's button moved from y=671 to y=531 between mousedown and mouseup), and the mouseup lands on a different element, so no click fires on the button. A second click is needed. Reproduced with manual `mouse.down()` / `mouse.up()`. The reverse direction (open a lower menu, click a higher group's Add) works, as does the keyboard path.
Suggested direction (not applied, per instructions): close on `click`/`focusin` rather than on `pointerdown`, or do not collapse the menu until pointerup.

## Passed criteria (1280 and 375 unless noted)

- AC1: not browser-checkable, no console or data issues. Not walked.
- AC2: Players shows Passing, Rushing, Receiving, Totals. Teams shows Offense, Defense, Overall. Headings are uppercase.
- AC3: only selected stats are rows, all checked, in definition order. Extras are not rows.
- AC4: an emptied group (Totals, Teams groups) keeps its heading and Add stat button.
- AC5: each kind keeps its own selection. Players selection was intact after a Teams round trip.
- AC6: loading, stale and failure states are not reproducible in the browser and were left to unit tests. No crash on initial load or reload.
- AC8: click and Space deselect.
- AC9: with one stat left: `aria-disabled="true"`, not natively disabled, still focusable, label dimmed to opacity 0.5. Click and Space leave it checked (Players and Teams). Re-enabled after adding a second stat.
- AC10: the Add button is absent once all stats of the group are selected (Passing: all 7 added, button gone).
- AC11 (apart from F1): click, Enter and Space open the menu directly below the button. Items are in definition order (Rushing: Rush TD, Yds / Carry, Carries, Rush Yds / G). A second activation closes it. One menu at a time (upper-to-lower direction aside).
- AC12: `aria-expanded` false then true. `aria-controls` equals the menu id while open. Names are "Add stat to <group>".
- AC13: picking Carries gives rows Rush Yds, Carries. Picks of Comp %, Pass TD and others always land in definition order. The menu closes after a pick.
- AC14 and AC18: Escape from an item or from the toggle closes the menu and focus lands on that group's Add button. Escape with focus elsewhere does nothing (expected).
- AC15 (apart from F1): a press on empty page area closes the menu. A press in menu padding keeps it open.
- AC16: switching Players/Teams by mouse and by keyboard closes the menu (Rushing open, then Teams, then Players: none open).
- AC17: opening focuses the first item.
- AC19: after a pick, focus is on the new checkbox.
- AC20: outside click closes it with no programmatic focus (focus falls to body by the browser's blur).
- AC21: keyboard-only walk. Tab order is nav, season, picker, then every stat checkbox and Add button in visual order. Space deselects, Enter or Space open the menu, Tab reaches all 7 Passing items, Enter picks, Escape closes. Tab out of an open menu leaves it open (assumption 10). The locked last stat stays in the tab order. Every focusable element has a 2px outline (rgb(47,95,208)) including the 16px checkboxes. Nav controls use white outlines, which are the nav's existing style.
- AC22: `aside[aria-label="Stats"]` followed by an empty `section[aria-label="Stat views"]`, inside the content container below the picker. Groups render as `fieldset` elements labelled by their h2 (implicit group role, equivalent to the planned `role=group`).
- AC23 (1280): sidebar x=28, width 232 (`flex: 0 0 232px`). Main at x=292, so the gap is 32px (292 - 260). Both tops are at y=235. The body is flex with gap 32px.
- AC24 (375): sidebar 232px at x=28, main below it at y=1275 and width 319, `scrollWidth` 375 (no horizontal scroll). With the Passing menu open the menu is 206px wide, x 54 to 260, within the sidebar.
- AC25: nav, picker and add-popover behave as before in this walk. No regressions seen.
- AC27: deselecting the first of two rows focuses the next row. The last of two focuses the previous row. The only row focuses the group's Add button. Focus never fell to body.
- Computed styles match design values:
  - Heading: 11px / 600, uppercase, letter-spacing 0.88px (.08em), rgb(138,138,133), padding `0 8px 6px`.
  - Group: flex column, gap 1px. Sidebar gap 16px.
  - Row: padding `7px 8px`, radius 7px, gap 10px, 14px, rgb(17,17,17), hover bg rgb(244,244,241).
  - Checkbox: 16px, radius 4px, checked fill and border rgb(17,17,17).
  - Add: 13px / 600, rgb(122,122,117), hover bg rgb(244,244,241) and text rgb(17,17,17). Icon is 16px, radius 4px, `1px dashed rgb(189,189,184)` as computed (1.5px specified, Chromium rounds it down at DPR 1), "+" 12px.
  - Menu: margin `2px 0 4px 26px`, white bg, `1px solid rgb(227,227,224)`, radius 8px, padding 4px, shadow `0 4px 12px rgba(0,0,0,.06)`.
  - Menu item: padding `7px 8px`, radius 6px, 13px.
  - Menu is inline: Receiving's heading moved down 140px when it opened.
  - Main: `flex: 1 1 560px`.
- Reload resets to defaults (persistence is out of scope). Console is clean.

## Not verified in browser
AC26 (unit tests, not run here per scope), AC6 loading/failure/stale, AC7. These are covered by unit tests only.

## Notes
- Back/refresh mid-flow: reload restores defaults with no errors. There is no URL state, so Back leaves the app.
- Menu contents are data-driven. They differ slightly from the plan's example text (Rushing also lists Rush TD), which is not a defect.

RESULT: FAIL
