# T25: Player detail with weekly trends, dot plot, readable 3D chart
**Phase:** 4 · **Size:** L · **Depends on:** T10 to T14

Requested by the owner on 2026-11-24. Where it differs from `design_handoff_statpakd/`, this ticket
wins (T20 must not revert these changes).

## Scope
- 2D chart: add a **Dot plot** next to Bars and Radar. Bars stay.
- 3D chart: viewed from above; walls always behind the data; numbered axes on the front edges;
  Front, Side and Top flat views; values on hover, tap or keyboard; nearer dots drawn bigger;
  shaded floor and walls; name tags that do not overlap; readout cards highlight their dot.
- Players: a **Compare players | Player detail** switch. Player detail picks one player and shows
  season stats, a week-by-week dot plot with average and trend lines, a game log table, and a
  comparison of chosen weeks (dot plots with trends, plus a table).
- Data: new `DataProvider.getGameLog(leagueId, playerId, season)`. The mock provider generates
  sample weekly values whose counting stats add up to the season totals.

## Out of scope
Comparing different players in the same week; real data (T21 to T23).

## Notes
- Chosen weeks have no upper limit (the request said "week 1 vs 2 vs 3 etc.").
- Bars stay the default 2D chart.
- The 3D projection now looks down on the cube (the design script looked up from below).

## Acceptance criteria
- [x] Dot plot shows one scale per selected stat, a dot per selected player, faint dots for the rest
      of the league, min and max labels, and every exact value as text.
- [x] At the default 3D view the far floor edge is above the near one and all three axes show
      minimum, middle and maximum values; flat views show two stats with no perspective distortion.
- [x] Any selected player's dot values can be read by pointer and by keyboard.
- [x] One bye week and 17 games per season; weekly counting stats sum to the season totals.
- [x] Choosing weeks (for example 1, 2 and 3) shows them as dot plots with a trend and as a table.
- [x] The weekly data is labelled as sample data in the UI.
- [x] No horizontal page scroll at 375px; axe (in jsdom) reports no serious or critical violations on the new views.
- [x] No league-specific names in components.
