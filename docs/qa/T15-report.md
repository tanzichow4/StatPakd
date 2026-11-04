# T15 QA report: Team breakdown header (branch ticket/T15-team-breakdown-header)

Method: `npm run dev` (http://localhost:5173/). The Playwright MCP could not start (no Chrome), so I drove the bundled Chromium through scratch Node scripts at 1280x900 and 375x900. Source was not edited. Dev server stopped afterwards. Console: no errors or warnings in any run. Network: no failed requests or 4xx/5xx.

## Failures
None blocking.

## Observations (minor, not failures)
- Chip border colour is rgb(222,222,218) (#DEDEDA) where AC12 says #DADAD6, and chips are pill-shaped (radius 999, padding 6px 14px). The ticket notes chip radius/padding is a known T20 deferral. The border colour is slightly different from the AC12 value, so it is worth a look in T20. Severity: trivial.
- The nav Players/Teams control and the chip row both expose fieldset groups. Only the chip row is named "Teams", but the nav's pressed "Teams" button is also inside the page, so role queries for "Teams" can be ambiguous. No user impact.
- The switch's active style animates over a short transition (about 150ms), so a screenshot taken immediately after a click can briefly show the old styling. The computed styles settle correctly.
- Reloading the page resets to Players/compare defaults (there is no persistence in the app; not part of T15).
- Null "—" rendering (AC17) cannot be reached with the mock NFL data, since all four values are present for every team and season. It is covered only by unit tests.

## Passed (browser-verified at both 1280px and 375px)
- AC1: Teams shows a "Team view" group with "Compare teams" then "Team breakdown". Exactly one is pressed and it matches the mode.
- AC2: Players mode shows no switch and no hint.
- AC3: Hint reads "Compare up to 8 teams side by side" in compare mode and "Compare players within one team" in breakdown mode. It sits to the right of the switch at 1280px and under it at 375px.
- AC4: Both options switch the mode. Clicking the active option changes nothing.
- AC5: Teams + breakdown, then Players, shows the normal players UI. Back to Teams shows breakdown again.
- AC6: In breakdown there is no picker ("Add team"), no sidebar, no view tabs, no table and no chart. Compare mode and Players mode are unchanged.
- AC7: The content is the chips fieldset, then the header section, with nothing after it and no placeholder text.
- AC8: The round trip compare -> breakdown -> compare kept the selected teams, the stats, the 3D tab, the axis selects, and the 3D camera after keyboard rotation (the point, label and tag styles are identical).
- AC9: With the add-stat menu open, compare -> breakdown -> compare leaves it closed. Players with the menu open -> Teams (inside) -> Compare teams leaves it closed.
- AC10: The add-entity popover is closed after breakdown and after returning to compare.
- AC11: Eight chips (KC, BUF, BAL, DET, PHI, MIN, GB, SF) in the Geist Mono font.
- AC12: The default team PHI is pressed with a black background and white text. The others are white. The group is named "Teams".
- AC13: Clicking BUF makes it the only active chip and the card switches to Buffalo Bills. Clicking the active chip changes nothing.
- AC15: The card shows "PHI", "Philadelphia Eagles" (22px/600) and "NFC East · 14–3 · 2024". The top border is 4px #111, the other borders are 1px #E3E3E0, the radius is 12px and the padding is 18px 22px.
- AC16: The four stats are Pts / G, Yds / G, Allowed / G and TO Diff, in that order. Labels are 11px/600 uppercase, 0.88px (0.08em) letter-spacing, #8A8A85. Values are Geist Mono 22px/600.
- AC17: PHI 2024 shows 27.2, 367.2, 17.8, +11. BUF 2022 shows a signed -2.
- AC18: Changing the season to 2023, 2022 and 2024 keeps BUF active. The record, season suffix and values all recompute (for example 12–5 · 2023 and 25.1 / 297.8 / 20.9 / +1).
- AC19 and AC14 were not reachable in the browser. They are covered by unit tests only.
- Layout: scrollWidth == clientWidth at 1280 and 375 in compare, breakdown, Table, 2D chart and 3D chart. At 375px the chips wrap onto two rows and the stats wrap onto two rows.
- Keyboard: Tab and Enter/Space operate the switch and the chips. Tab order in breakdown is switch, chips KC..SF, then the page end. The focus ring is a 2px solid rgb(47,95,208) outline on both the switch and the chips.
- Earlier views (Table, Bars, Radar, 3D) render with no regressions, and compare mode is unchanged.
- Design match: 4px black top border, black active chip, 44px mono abbreviation, header typography all look right in the screenshots (apart from the chip border colour noted above).

RESULT: PASS
