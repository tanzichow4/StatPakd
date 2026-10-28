# T17: Sortable roster table
**Phase:** 3 · **Size:** M · **Depends on:** T15

## Scope
Roster table per handoff. Offense cols: Snap %, Touches, Targets, Scrim Yds, TD, Yds/Touch. Defense cols: Snap %, Tackles, Sacks, INT, Pass Def, Forced Fum. Click header to sort (desc first, then asc, with arrows), snap cell with 72x4 mini bar, team leader per column in black pill, caption.

## Acceptance criteria
- [ ] Sorting handles nulls (last) and ties stably.
- [ ] Headers are buttons with `aria-sort`.
- [ ] Switching Offense/Defense resets sort to Snap % desc.
- [ ] Component tests for sort toggle, leader pill, null handling.
