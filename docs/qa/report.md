# QA report: T07 global nav

Branch `ticket/T07-global-nav`. Dev server: `npm run dev` in `web/`, http://localhost:5173/ (stopped afterwards).

Method note: the playwright MCP tools were not available in this session. I drove the bundled Chromium
(ms-playwright chromium-1248) through `playwright-core` scripts kept in the scratchpad, at 1280x800 and
375x800. Computed styles, bounding boxes, Tab order, console and network were read programmatically, and I
checked screenshots at both widths. No source or tests were edited.

## Result per criterion

All pass at both 1280px and 375px unless noted.

- AC1 PASS: on `/` the first child of `#root` is `<header>` (banner). `/dev` renders the DevPage with no header.
- AC5 PASS: "Stat" is white and "Pakd" sits in a pill (bg rgb(255,255,255), text rgb(17,17,17), radius 5px, padding 0 6px 2px). The logo is 2px gap, Geist 700, 20px, letter-spacing -0.6px. A sr-only span reads "StatPakd" and the visual spans are `aria-hidden`.
- AC6 PASS: `<nav aria-label="Leagues">` holds NFL, NBA, MLB, NHL in provider order.
- AC7 PASS: NFL is white, has no SOON tag and has `aria-current="page"`. It is the only item with `aria-current`.
- AC8 PASS: NBA, MLB and NHL are native `disabled` and rgb(106,106,102). Each has a SOON tag in Geist Mono 10px, same colour, 5px gap. Tab skips them. Clicking NBA (forced) changed nothing, and no `aria-current` appeared on it.
- AC9 PASS (browser part): the bar renders with no console errors on load. Pending and reject paths are covered only by unit tests, which I did not re-run here.
- AC10 PASS: the group is `fieldset aria-label="Players or teams"`. Players has `aria-pressed=true` initially (white bg, dark text). Teams is transparent with rgb(165,165,160) text.
- AC11 PASS (UI part): clicking Teams gives Teams `aria-pressed=true` and Players false. Clicking Players reverses it. The q, pos and addOpen resets are not visible in the UI and are left to the unit tests.
- AC12 PASS: options are "2024 Regular Season", "2023 Regular Season", "2022 Regular Season", values 2024, 2023, 2022, newest first.
- AC13 PASS: the initial value is 2024. Choosing 2023 sets the select to 2023. After a reload it returns to 2024, which is expected because nothing is persisted.
- AC14 PASS: the select has `aria-label="Season"` and is wrapped by a visible "Season" label.
- AC15 PASS (1280px):
  - Header: bg rgb(17,17,17), padding 12px 28px, gap 24px, flex-wrap wrap, one row 59px tall.
  - Logo is at x=28 and ends at 128. Leagues start at x=152, which is 24px later. League items are 18px apart.
  - League items are 13px/600. Right group ends at x=1252, which is 28px from the right edge. Its gap is 12px.
  - Kind track: rgb(42,42,40), radius 8px, padding 3px. Items: 13px/600, padding 6px 14px, radius 6px. The track gap is 2px, accepted per A7.
  - Season label: 12px, rgb(165,165,160), 8px to the select.
  - Select: bg rgb(42,42,40), border 1px solid rgb(58,58,55), radius 7px, padding 6px 10px, white 13px/600.
  - Fonts: Geist 400/600/700 and Geist Mono 600 are loaded.
- AC16 PASS (375px):
  - `scrollWidth` 375 and `clientWidth` 375, so there is no horizontal scroll.
  - Rows are: logo (y=12), leagues (y=64), kind control (y=105), Season label and select (y=152).
  - Every element lies within 0 to 375 with a 28px left edge. The right group is 319px wide (28 to 347), so the right padding is 28px.
  - All four league items with SOON tags, both kind buttons, the Season label and the select are fully visible and not clipped (checked in screenshot).
- AC17 PASS: Tab order is NFL, Players, Teams, Season select, then focus leaves to the body. NBA, MLB and NHL are never focused. Each control shows a solid 2px white (rgb(255,255,255)) outline, visible on #111 in the screenshot.
- AC22 PASS: on `/dev` the dark Select has padding 6px 10px and the light Select has 7px 10px.
- Console and network: zero console errors or warnings and zero failed requests at either width, on `/` and `/dev`.
- Reload mid flow (after Teams and a season change): the page recovers with defaults (Players, 2024), no errors.

Not browser-checkable here, so not covered: AC2 to AC4, AC18 to AC21 (test, lint, typecheck, format and build gates). I did not run them.

## Failures

None.

## Minor observations (not failures)

- The placeholder `<h1>StatPakd</h1>` below the nav has no margin or padding, so it sits flush at x=0. This is out of scope (T08 onward replaces it).
- "SOON" inherits weight 600. The design does not specify a weight.
- At 375px the logo and leagues take separate rows (the leagues do not fit beside the logo). This is allowed by A8.

RESULT: PASS
