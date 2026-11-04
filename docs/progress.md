# Autobuild progress

Range T01-T20. Integration branch: `autobuild`. Baseline before run: web lint/typecheck/test/build, ruff, pytest all green.

| ID | status | branch | notes |
|---|---|---|---|
| T01 | done | (pre-existing on main) | Already implemented before the run; baseline checks green. |
| T02 | done | (pre-existing on main) | Already implemented before the run; baseline checks green. |
| T03 | done | ticket/T03-domain-types-and-provider-interface | Merged 1db07af. Browser QA skipped (no UI). Assumptions in docs/plans/00-requirements.md (string IDs, opaque roster unit, League {id,name,enabled}). |
| T04 | done | ticket/T04-mock-nfl-data | Merged 938e51c. Browser QA skipped (no UI). 186 web tests pass. |
| T05 | done | ticket/T05-stat-utilities | Merged 009881c. No UI, browser QA skipped. 100% branch coverage on stats.ts. |
| T06 | done | ticket/T06-app-state | Merged 003931f. No UI, browser QA skipped. 1 fix round (lint warnings in tests). 675 web tests pass. |
| T07 | done | ticket/T07-global-nav | Merged 67693eb. Browser QA PASS at 1280/375 (docs/qa/report.md; qa-tester used playwright-core scripts because the Playwright MCP tools were unavailable to the subagent). 722 web tests pass. |
| T08 | done | ticket/T08-entity-picker | Merged f485888. Browser QA PASS at 1280/375 (summary in docs/qa/T08-summary.md; the agent's own report file was not saved). 903 web tests pass. |
| T09 | done | ticket/T09-stat-sidebar | Merged 68a1c34. Browser QA: round 1 FAIL (F1: pressing a lower group's Add stat while a menu was open only closed it), fixed with regression test, round 2 PASS (docs/qa/T09-report.md, T09-report-2.md). 1043 web tests pass. |
| T10 | done | ticket/T10-compare-panel-and-table | Merged 98524fe. Browser QA round 1 FAIL (F1 page-level horizontal scroll from sr-only spans), fixed; round 2 PASS (docs/qa/T10-report.md, T10-report-2.md). 1209 web tests pass. |
| T11 | done | ticket/T11-bars-chart | Merged c1d3fee. Browser QA PASS first time (docs/qa/T11-report.md). 1257 web tests pass. |
| T12 | done | ticket/T12-radar-chart | Merged 7cfd737. 1 fix round (RadarChart markup did not match plan; lint warnings). Browser QA PASS (docs/qa/T12-report.md). 1361 web tests pass. |
| T13 | done | ticket/T13-3d-math | Merged ed9c836. No UI, browser QA skipped. Projection coordinates verified against the design formula in node. 1438 web tests pass. |
| T14 | todo | ticket/T14-3d-chart | |
| T15 | todo | ticket/T15-team-breakdown-header | |
| T16 | todo | ticket/T16-share-of-production | |
| T17 | todo | ticket/T17-roster-table | |
| T18 | todo | ticket/T18-responsive-and-a11y | |
| T19 | todo | ticket/T19-e2e-tests | |
| T20 | todo | ticket/T20-visual-fidelity-pass | |

## Assumptions

- T03: roster `unit` is an opaque string; column/share defs not in DataProvider yet (revisit in T15-T17). RosterEntry = {id,name,position,number?,stats}.

- T04: faithful port of the design script; unknown league/season/team/unit ids reject, disabled leagues return empty arrays; roster row ids are <team>-<unit>-<index>; players on CIN/WAS/ATL/DAL/LV have a teamId with no team entity; sample label is the design footer text.

- T05: design script wins over the ticket: no thousands separators when decimals is set, decimals 0 behaves like unset; bestIndex returns all tied indices ([] if <2 non-null); leagueRange returns null for no data; normalize does not clamp; bars never inverted, radar inverts via options.invertLowerIsBetter; barWidth(null)=0.

- T06: reducer is a factory createAppReducer(config) so it holds no league data; NFL defaults live in web/src/data/nfl/uiDefaults.ts; KindDefaults/LeagueUiDefaults added to domain types; pitch clamped in the reducer; switching kind does not close the add-stat menu; added ACs 30-32 (invalid axis/camera inputs are no-ops, no-op actions return the same state object); selections are not pruned on season change.

- T07: active league = first enabled league (no league field in app state; league switching is out of scope); DataProvider supplied via a DataSource context in web/src/dataSource/; App.tsx is the only file naming MockProvider; logo is plain text, placeholder h1 stays; at 375px the right-hand group wraps (deliberate deviation from the design); dark Select padding changed to 6px 10px; 'Regular Season' suffix is fixed text; added AC21/AC22.

- T08: player cards show entity.badge (position), not jersey number, because Entity has no number field; search matches name OR teamId (players) / shortName (teams); position chips derived from loaded data; popover is non-modal, outside click does not close it; popover shifts left to stay inside the viewport (AC35); popover root is a <dialog open> and chip group a <fieldset> to satisfy lint; useActiveLeagueId added to dataSource (nav and picker each call getLeagues once); picker shown for Players, and for Teams only in compare mode.

- T09: stat defs load via useStatDefs (stale results ignored); new reducer action closeAddStatMenu (setKind unchanged); sidebar closes the menu on kind change via an effect, so a future ticket that hides the sidebar (Team breakdown mode) must dispatch closeAddStatMenu itself; last selected stat is locked with aria-disabled (dimmed, still focusable) via new Checkbox props locked/inputRef/className; groups/menu are <fieldset> elements; outside pointerdown closes the menu except on another group's Add button; sidebar stays 232px and stacks above the main area at 375px; added AC27 (focus after deselect).

- T10: compare tab default is 3D chart; chart tabs are placeholders until T11-T14; compact header (5+ entities) omits the sub line when badge equals shortName (teams); sr-only spans clipped via position:relative on the scroll container.

- T11: bars not inverted for lower-is-better (design script); N/A shows muted dash with no fill; equal pool range gives ~52% width; narrow screens stack the label above the bars via flex-wrap; chart is non-interactive.

- T12: null values plot at center (ticket) not at the design's 0.08 floor; axes in canonical stat order not pick order; legend note 'Not applicable: <labels>'; zero selected stats still renders nothing (panel behaviour); legend not hidden from AT..

- T13: DIFFERS FROM TICKET: a selected entity with a null axis is still plotted (null -> -1), only unselected points with nulls are excluded, per the design script; unknown selected ids dropped (AC26); toCube maps min==max or null range to 0; lower-is-better not inverted in 3D; plotPoints(pool, axes, selectedIds, cam) signature chosen by coder; ties keep pool order.

## Out-of-scope ideas

- T08: at 375px the open popover is ~450px tall and extends past the viewport bottom, making the page scroll; revisit in T18 (responsive). Many-chip wrapping not stressed with mock data.

- T07: placeholder h1 sits flush at x=0 (fine until T08+ replaces the placeholder). Playwright MCP tools not reachable from subagents: qa-tester falls back to playwright-core scripts.

- T12: at 375px on Teams radar, long axis labels near the box edge wrap to 2-3 lines and 'Pts Allowed / G' can overlap the bottom ring vertex; revisit in T18 (responsive).
