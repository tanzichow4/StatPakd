# T08: Entity cards and add popover
**Phase:** 2 · **Size:** M · **Depends on:** T02, T04, T06

## Goal
Picker cards row with the add/remove flow.

## Scope
Handoff section 4 "Picker cards row" and "Add popover": entity card (series-color top border, badge, name, meta, remove), add card with "N of 8 slots open", popover with autofocus search, position chips (Players only), scrollable results, Add/Remove button, "Done", empty "No matches.", disabled Add when full.

## Acceptance criteria
- [ ] Series color follows selection order.
- [ ] Search filters by name and team; position chips filter players.
- [ ] Add is disabled at 8; popover closes when full; Escape closes it.
- [ ] Add card hidden at 8 selected.
- [ ] Focus returns to the add card when the popover closes.
- [ ] Component tests for add, remove, filter, full, empty.
