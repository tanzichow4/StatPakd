# T15: Teams mode switch, chips, header card
**Phase:** 3 · **Size:** M · **Depends on:** T04, T07

## Scope
Handoff sections 3 and 5 (top): "Compare teams" | "Team breakdown" switch with hint text (Teams only), team chips (active black), team header card (4px black top border, abbr, name, meta "Division · W–L · season", summary stats Pts/G, Yds/G, Allowed/G, TO Diff). Selecting a team and season recomputes the card.

## Acceptance criteria
- [ ] Switch only appears when kind is Teams.
- [ ] Chips and header are driven by provider data, no hard-coded teams.
- [ ] Component tests for mode switch, chip select, season change.
