# T11: 2D Bars chart
**Phase:** 2 · **Size:** S · **Depends on:** T10

## Scope
Handoff "2D Bars": per stat row grid `160px | 1fr`; per entity a 110px name column, 16px track, fill width `5% + 95% * normalized(league range)`, value column. Lower-is-better bars are not inverted here (confirm against the design script).

## Acceptance criteria
- [ ] Widths come from the league pool range, not just the selection.
- [ ] N/A entities show "—" and no bar.
- [ ] Each bar has an accessible text value; color is not the only identifier (name is shown).
- [ ] Component test for width calculation and N/A.
