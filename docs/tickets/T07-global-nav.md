# T07: Global nav
**Phase:** 2 · **Size:** S · **Depends on:** T02, T06

## Goal
Black top bar with logo, league tabs, Players/Teams control and Season select.

## Scope
Handoff section 1. League tabs from the provider: enabled ones are clickable, others show a "SOON" tag and are disabled. Season options from `getSeasons`. Wire to state; changing kind or season dispatches the T06 actions.

## Acceptance criteria
- [ ] Matches handoff spec (colors, sizes, wrapping at narrow widths).
- [ ] Disabled league tabs are not focusable as active and announce as disabled.
- [ ] Switching Players/Teams resets search, position filter and popover.
- [ ] Component test for kind and season changes.
