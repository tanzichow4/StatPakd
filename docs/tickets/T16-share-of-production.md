# T16: Share of production stacked bars
**Phase:** 3 · **Size:** M · **Depends on:** T15

## Scope
"Share of team production" with Offense/Defense toggle. Offense shares: Touches, Targets, Scrimmage Yds, Touchdowns. Defense: Tackles, Sacks, Takeaways, Passes Defended. Rows `150px | 1fr | 150px`: label and total, 100% stacked bar (30px, segments by value, percent text at 9% or more, tooltip "Name · value (pct%)"), "Leader: Name pct%". Legend of roster players with colors.

## Acceptance criteria
- [ ] Percentages come from a pure, tested `shares()` function; they sum to 100 (rounding handled).
- [ ] A zero-total stat renders an empty bar, not NaN.
- [ ] Segment tooltips are reachable by keyboard focus and text alternative.
- [ ] Component tests for the toggle, leader, zero total.
