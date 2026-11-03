# QA summary: T08 entity picker

Summary of the qa-tester hand-back for branch `ticket/T08-entity-picker`. The agent's full report file was not saved to the repo, so this is a second-hand summary, not the original report.

Method: installed Chromium driven with playwright-core scripts at 1280x800 and 375x800 (Playwright MCP tools were unavailable to the subagent).

- Covered: AC5-AC17, AC19-AC32, AC35. Not covered in the browser: AC1-AC4, AC18 (not reachable in the UI), AC33, AC34 (test/lint/typecheck/build gates, run separately and green: 903 tests).
- Console and network: zero errors or warnings, zero failed requests at both widths on `/` and `/dev`. Reload with the popover open recovers to defaults with it closed.
- Focus: `document.activeElement` was never `<body>` in any flow (add to 8, card removal, closing, kind switch).
- Observations (not failures): at 375px the open popover is about 450px tall and extends past the viewport bottom (page scroll height grows from about 845 to 1223px; the results list stays capped at 340px and scrolls inside; no horizontal overflow). The add-card border computes to 1px at DPR 1 (source says 1.5px). Chip wrapping not stressed (5 chips in mock data). The app has no routes, so browser Back was not testable.

RESULT: PASS
