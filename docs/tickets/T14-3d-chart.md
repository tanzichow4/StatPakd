# T14: 3D chart, axes and readout
**Phase:** 2 · **Size:** L · **Depends on:** T10, T13

## Scope
Handoff "3D chart" and "Readout": X/Y/Z selects (any stat), "Reset view", 600x460 SVG card, drag to rotate (pointer events, works on touch), every league entity plotted (selected r7 in series color with name tag, others r4.5 `#C9C9C4`), dashed drop lines, HTML overlay labels positioned in %. Readout aside (280px) with a card per selected entity showing X/Y/Z values.

## Acceptance criteria
- [ ] Dragging rotates; releasing stops; Reset restores defaults.
- [ ] Axis changes update the plot and readout; axes persist per kind.
- [ ] Keyboard alternative: arrow keys rotate when the plot is focused.
- [ ] Selected points are visible above unselected ones (depth sort plus selected last).
- [ ] Readout shows "—" for N/A.
- [ ] Component tests for axis change, reset, readout; manual check that drag feels right at 60fps with the full league pool.
