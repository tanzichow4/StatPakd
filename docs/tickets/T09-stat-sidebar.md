# T09: Stat sidebar and Add stat menu
**Phase:** 2 · **Size:** M · **Depends on:** T02, T04, T06

## Goal
232px sidebar listing only selected stats by group with an inline "+ Add stat" menu.

## Scope
Handoff "Stat sidebar". Groups come from `StatDef.group`. Deselect via checkbox (blocked at 1 remaining). "+ Add stat" lists that group's unselected stats (including `extra` ones); picking one selects it in canonical order.

## Acceptance criteria
- [ ] The last selected stat cannot be deselected.
- [ ] Added stats appear in canonical group order.
- [ ] Groups differ by kind (Players vs Teams) with no hard-coded names in the component.
- [ ] Menu closes on pick, Escape and outside click.
- [ ] Component tests for each rule.
