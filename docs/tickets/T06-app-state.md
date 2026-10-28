# T06: App state reducer and context
**Phase:** 1 · **Size:** M · **Depends on:** T03

## Goal
Single source of UI state with the rules from the handoff enforced in one place.

## Scope
State per the handoff: `kind, season, sel{players,teams}, stats{...}, ax{...}, view, chart2, q, pos, addOpen, addStatOpen, teamMode, teamId, unit, tSort, yaw, pitch`. Provide `useAppState()` and a pure `reducer`.

Rules to enforce:
- Max 8 selected per kind; adding at 8 closes the popover. Players and teams keep separate selections.
- Min 1 stat per kind; stats kept in canonical group order after adding.
- Switching kind resets `q`, `pos`, `addOpen`.
- Season change keeps selections.
- Defaults match the design (sel, stats, ax, `view: '3d'`, yaw -0.65, pitch 0.38).

## Acceptance criteria
- [ ] Reducer is pure and fully unit tested for every rule above.
- [ ] Context provider and hook have a test that renders a consumer.

## Out of scope
Any rendering.
