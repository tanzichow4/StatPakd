# T25: Week to week view, dot graph, readable 3D chart
**Phase:** 4 · **Size:** L · **Depends on:** T10 to T14

Requested by the owner on 2026-11-24 and revised the same day. Where it differs from
`design_handoff_statpakd/`, this ticket wins (T20 must not revert these changes).

## Scope
- Players have two viewing options, **Week to week** and **Season totals**, sharing the same
  selected players (1 to 8). Season totals is the starting view.
- Week to week: a week selector (all, last 4, a range, single weeks); a dot graph by week or stat
  against stat, with optional trend lines; a table beneath; totals for the chosen weeks by category
  on the side. Picking a total graphs it.
- Season totals: Table, 2D chart (Bars, Radar, **Dot graph**) and 3D chart. The dot graph takes an
  X axis alone (one row per player) or an X and a Y stat.
- Play statistics: snaps, snap %, pass attempts and completions.
- 3D chart: viewed from above; walls behind the data; numbered axes; Front, Side and Top views;
  values on hover, tap or keyboard.
- Data: `DataProvider.getGameLog(leagueId, playerId, season)` and `StatDef.rollup` (how weeks
  combine into a total). The mock provider generates sample weekly values.
- A crash shows a message with a reload button.

## Out of scope
Real data (T22, T23; source chosen in `docs/decisions/data-provider.md`).

## Notes
- Teams screens keep their previous behaviour, including the Teams dot plot.
- Bars stay the default 2D chart.
- Passer rating totals are an average of the weeks and are marked "avg".
- The 3D projection now looks down on the cube (the design script looked up from below).

## Acceptance criteria
- [x] The player view switch offers Week to week and Season totals.
- [x] The week selector changes the graph, table and totals together.
- [x] Both dot graphs have labelled x and y axes; season totals can use x alone.
- [x] One player's trend and a comparison between players use the same weekly graph.
- [x] Weekly counting stats add up to the season values, and so do completion % and snap %.
- [x] The weekly data is labelled as sample data in the UI.
- [x] No horizontal page scroll at 375px; axe (in jsdom) reports no serious or critical violations
      on the new views.
- [x] No league-specific names in components.
