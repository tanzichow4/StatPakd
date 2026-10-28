# T10: Compare panel, tabs and Table view
**Phase:** 2 · **Size:** M · **Depends on:** T05, T08, T09

## Goal
The main Compare layout and the Table view.

## Scope
- Body layout: sidebar plus main panel, wraps on narrow screens. Tabs "Table", "2D chart", "3D chart"; Bars | Radar control when 2D is active (charts themselves arrive in T11, T12, T14, so render placeholders).
- Table per handoff: grid `minmax(170px,1.3fr) repeat(n, minmax(0,1fr))`, min-width `190 + 130n`, horizontal scroll, short names and jersey when more than 4 entities, "lower is better" note, best value black pill, "—" for N/A, caption.
- Empty state when nothing is selected.

## Acceptance criteria
- [ ] Best value highlighted per row using T05; N/A excluded.
- [ ] Table scrolls horizontally instead of squashing at 8 entities.
- [ ] Table uses real `<table>` semantics or ARIA grid roles with column and row headers.
- [ ] Component tests: best pill, N/A, many entities, empty.
