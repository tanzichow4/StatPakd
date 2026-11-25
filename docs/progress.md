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
| T14 | done | ticket/T14-3d-chart | Merged e3b8502. Browser QA PASS first time (docs/qa/T14-report.md); drag ~180fps on 16-player mock pool in headless dev build. 1717 web tests pass. |
| T15 | done | ticket/T15-team-breakdown-header | Merged 6a47b82. Browser QA PASS first time (docs/qa/T15-report.md). 1826 web tests pass. |
| T16 | done | ticket/T16-share-of-production | Merged 2920571. 1 fix round (a11y lint warnings). Browser QA PASS (docs/qa/T16-report.md). 2065 web tests pass. |
| T17 | done | ticket/T17-roster-table | Merged 8e79427. Run was cut off after QA; resumed, leftovers committed as WIP: T17. Browser QA PASS first time (docs/qa/T17-report.md). 2234 web tests pass. |
| T18 | done | ticket/T18-responsive-and-a11y | Merged 5081fdb. 1 fix round (QA R1: radar label on ring vertex and 3D label/tag/hint overlaps at 375px); round 2 PASS (docs/qa/T18-report.md, T18-report-2.md). axe (all rules) 0 violations on 16 views at 375/1280. Contrast tokens darkened, decisions pending design sign-off in docs/a11y.md. 2571 web tests pass. |
| T19 | in-progress | ticket/T19-e2e-tests | Partly done; merged to main on 2026-11-24 at the owner's request. Done: plan tasks T1-T7 and the T10 CI job; 20 e2e tests pass at 375/1280, 60/60 with --repeat-each=3. Remaining: season spec (T8, AC15), kind-switch spec (T9, AC16), rest of local validation (T11: trace proof, YAML check) and the QA report (T12, docs/qa/T19-report.md). |
| T20 | todo | ticket/T20-visual-fidelity-pass | See T25 for intentional design deviations. |
| T25 | done | ticket/T25-player-weeks-dot-plot | Owner request, built outside autobuild on top of main; revised after owner feedback (see ticket); merged into main on 2026-11-24. New DataProvider.getGameLog and StatDef.rollup (T22 must serve both). Checks green: unit, e2e at 375/1280, lint, types, format, build, ruff, pytest. The qa-tester agent was not run. |
| T21 | done | (decision) | Owner chose nflverse via nflreadpy. No three-way comparison was written; data terms still open (docs/decisions/data-provider.md). |
| T22 | done | ticket/T22-nflverse-api | Python API over nflverse, built with T23 on one branch; not merged. CI not run; .env.example not updated. |
| T23 | done | ticket/T22-nflverse-api | ApiProvider is the default data source, with loading, failure and retry. Skeletons were not built. Added at the owner's request: an Include playoffs switch, and npm run dev starting the API too. |

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

- T14: 3D view always uses the 3 saved axes per kind, independent of sidebar stats (not hidden by the no-stat-rows gate); selected points drawn last (ticket) rather than pure depth sort (design); drag uses pointer capture and ends on release/cancel/lostcapture; arrows rotate 10px-equivalents (Shift x5, Home reset, Ctrl/Alt/Meta ignored); Select gained optional placeholder/className props; container query used for Readout layout; existing 3D-placeholder tests were rewritten for the new behaviour, not deleted.

- T15: summary stats come from optional StatDef.summaryLabel via getStatDefs (no new provider method; T22 inherits this contract); breakdown mode hides picker, sidebar and compare panel, shows only chips then header card (no placeholder for T16/T17); TeamBreakdown dispatches closeAddStatMenu once on mount; unknown teamId shows chips but no card (no auto-select); compare state is preserved across the round trip; shared pill Chip reused as-is, exact team-chip styling deferred to T20; TeamChips uses a fieldset named 'Teams'.

- T16: CONTRACT CHANGE for T17/T22: new REQUIRED DataProvider.getRosterUnits(leagueId) returning RosterUnitDef{key,label,stats:StatDef[]} plus optional StatDef.shareLabel marking share stats (disabled league -> [], unknown league rejects); the NFL unit defs carry the design column and share labels and take is marked extra; shares() uses largest-remainder rounding (ties to the earlier entry; null/negative/non-finite as 0; zero total -> all 0), so a percent can differ by 1 from the design's Math.round; unit toggle uses the existing state.unit/setUnit; every segment is a Tab stop (27 on mock offense, revisit in T18); rows stack below 480px; unknown unit skips getRoster; T15 tests that pinned 'nothing after the card' / 'getRoster not called' were rewritten for the new behaviour, not deleted.

- T18: DECISIONS PENDING DESIGN SIGN-OFF (docs/a11y.md): muted #6f6f6a; label/faint/na #73736e; share-segment text colour is ink on 5 of 8 series colours (white on the rest); axe-core dev dependency; live region is an <output aria-live=polite>; share rows are one Tab stop with arrow keys; Add popover is a bottom sheet below 480px; 40px touch targets only at <=1023px (desktop controls under 40px documented); non-colour series encoding only proposed.

## Out-of-scope ideas

- T08: at 375px the open popover is ~450px tall and extends past the viewport bottom, making the page scroll; revisit in T18 (responsive). Many-chip wrapping not stressed with mock data.

- T07: placeholder h1 sits flush at x=0 (fine until T08+ replaces the placeholder). Playwright MCP tools not reachable from subagents: qa-tester falls back to playwright-core scripts.

- T12: at 375px on Teams radar, long axis labels near the box edge wrap to 2-3 lines and 'Pts Allowed / G' can overlap the bottom ring vertex; revisit in T18 (responsive).

- T14: at 375px axis labels keep 11px and are clipped at card edges; with 8 selected the name tags overlap (no collision avoidance); mock pool is small so AC41 smoothness was not stress-tested on a real device. Revisit in T18/T20.

- T15: chip border is #DEDEDA vs design #DADAD6 and chips are pills (design: radius 8, padding 7px 12px); check in T20.

- T16: keyboard-focus tooltip is anchored at the bar's left edge rather than above the focused segment (cosmetic); 27 Tab stops per offense row set. Revisit in T18/T20.

- T18: 3D name-tag collisions with 8 selected and non-default axes (all widths) remain (T14 deferral); Teams radar with 4 axes at 481-1024px has 'Pts Allowed / G' 1-12px outside the chart box (still in viewport, unclipped); clicking outside the Add popover does not close it; no state persistence across reload. Dev server on port 5173 may still be running from QA (could not be killed by the agent; please stop it).
