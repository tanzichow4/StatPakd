# T15 requirements: Teams mode switch, team chips, team header card

Source ticket: `docs/tickets/T15-team-breakdown-header.md` (its acceptance criteria are the contract).
Design references: `design_handoff_statpakd/README.md` sections 3 and 5 (lines 25-26, 43-45);
`design_handoff_statpakd/design/StatPakd App.dc.html` markup lines 32-39 (switch + hint), 40/153
(`isCompare` wraps picker, sidebar and main panel), 154-165 (chips and header card) and script
lines 420-429 (`isInside`, `team`, `tf`, `tb.abbr/name/meta/summary`), 445-449 (`isCompare`,
`teamModeHint`, `teamModeTabs`, `teamChips`).
Merged building blocks to reuse (do not change their existing behaviour unless stated below):
- `web/src/state/appState.ts` (T06): `teamMode` (`'compare' | 'inside'`, default `'compare'`),
  `teamId` (default from `LeagueUiDefaults.teamId`), `season`, actions `setTeamMode` (also closes the
  add popover), `setTeam`, `setSeason`, `closeAddStatMenu` (T09).
- `web/src/components/picker/useEntities.ts` (T08): entities per kind and season; `[]` while loading,
  on failure, or for a stale load.
- `web/src/components/sidebar/useStatDefs.ts` (T09): stat definitions per kind.
- `web/src/components/picker/EntityPicker.tsx` (T08): already returns nothing for Teams in breakdown
  mode.
- `web/src/components/ui`: `SegmentedControl` (fieldset + `aria-pressed` buttons), `Chip`
  (`aria-pressed`, optional `mono`).
- `web/src/lib/stats.ts`: `formatStat`, `NULL_PLACEHOLDER` ("—").
- `web/src/state/appState.ts`: `MAX_SELECTED` (8).

## Goal

When the entity kind is Teams, show a "Compare teams" | "Team breakdown" switch with hint text; in
Team breakdown mode replace the compare UI with a row of team chips and a header card for the chosen
team (badge, name, "meta · season" line and four summary stats). All team names, abbreviations,
records and summary stats come from the DataProvider for the current season, so the components stay
league-agnostic and the card updates when the team or season changes.

## Acceptance criteria

Mode switch

- AC1: When `kind` is Teams, a segmented control labelled "Team view" (accessible name) is rendered
  above the picker/breakdown content with two buttons, "Compare teams" and "Team breakdown", in that
  order. Exactly one has `aria-pressed="true"`, matching `state.teamMode` (`compare` -> "Compare
  teams", `inside` -> "Team breakdown").
- AC2: When `kind` is Players, neither the switch nor its hint text is rendered, regardless of
  `state.teamMode`.
- AC3: Hint text is shown to the right of the switch: "Compare up to 8 teams side by side" in compare
  mode and "Compare players within one team" in breakdown mode. The number comes from
  `MAX_SELECTED`, not a literal in the component.
- AC4: Clicking "Team breakdown" sets `teamMode` to `inside`; clicking "Compare teams" sets it to
  `compare`. Clicking the already-active option leaves the view unchanged.
- AC5: `teamMode` persists across kind switches: Teams + breakdown -> Players shows the normal
  players compare UI; switching back to Teams shows breakdown mode again.

What breakdown mode shows and hides

- AC6: In Teams + breakdown mode, the entity picker, the stat sidebar and the compare panel (view
  tabs, table, charts, readout) are not rendered (absent from the DOM / accessibility tree). In Teams
  + compare mode and in Players mode they render exactly as before T15.
- AC7: In Teams + breakdown mode, the content below the switch is, in order: the team chips row, then
  the team header card, then nothing else (the share-of-production section and roster table arrive in
  T16/T17). No placeholder text is shown for them.
- AC8: Leaving breakdown mode restores the compare UI with its previous state intact: selected teams,
  selected stats, active view tab, 2D sub-mode, 3D axes and camera are unchanged by a round trip
  compare -> breakdown -> compare.
- AC9: No stat-sidebar "Add stat" menu is open when the sidebar becomes visible again after breakdown
  mode, whichever way breakdown mode was entered: (a) a menu open in Teams compare mode, then switch
  to breakdown and back; (b) a menu open in Players mode, then switch kind to Teams while `teamMode`
  is `inside`, then switch to "Compare teams". In both cases `state.addStatOpen` is `null` once
  breakdown mode is showing.
- AC10: The add-entity popover is closed after entering breakdown mode (existing `setTeamMode`
  behaviour) and is still closed on returning to compare mode.

Team chips

- AC11: The chips row shows one chip per team entity returned by
  `getEntities(activeLeague, 'teams', state.season)`, in provider order, each labelled with the
  entity's `badge`, in the mono font. The component contains no team ids, names or abbreviations.
- AC12: The chip whose entity `id` equals `state.teamId` is active (`aria-pressed="true"`, black
  background, white text); all others are inactive (white background, `#DADAD6` border). The chips
  are grouped under an accessible name ("Teams").
- AC13: Clicking an inactive chip makes it the only active chip and the header card switches to that
  team. Clicking the active chip changes nothing.
- AC14: While team entities are loading, or if loading failed, no chips and no header card are
  rendered and nothing throws.

Team header card

- AC15: The header card shows, for the entity whose `id` equals `state.teamId`: its `badge` (mono,
  44px), its `name` (22px/600) and a meta line equal to `` `${entity.meta} · ${state.season}` ``
  (for the mock NFL default team in 2024 this reads like "NFC East · 14–3 · 2024", with the record
  coming from the data). The card has a 4px `#111` top border, 1px `#E3E3E0` other borders, radius
  12 and padding `18px 22px`.
- AC16: The right side of the card shows the team summary stats supplied by the data layer (see
  Assumption A3), in the order supplied. For the mock NFL data these are exactly four, labelled
  "Pts / G", "Yds / G", "Allowed / G", "TO Diff" and taken from the team stat keys `ppg`, `ypg`,
  `papg`, `to`. Labels are 11px/600 uppercase with letter-spacing .08em in `#8A8A85`; values are mono
  22px/600.
- AC17: Each summary value is formatted with `formatStat` using that stat's definition (decimals and
  sign), so `ppg` shows one decimal (e.g. "27.2") and a positive `to` shows a leading "+" (e.g.
  "+11"). A null or missing value shows "—".
- AC18: Changing the season in the global nav while in breakdown mode reloads the team entities for
  the new season: the chips stay on the same `teamId`, and the card's record, meta season suffix and
  summary values reflect the new season's data.
- AC19: If no team entity matches `state.teamId` after loading (for example a future data source
  without that team), no chip is active and the header card is not rendered; nothing throws and the
  state is not changed automatically. Clicking any chip then shows that team's card.
- AC20: No component added or changed by T15 contains league-specific names or stat keys (team ids,
  abbreviations, "NFL", `ppg`, etc.); the existing `noLeagueLiterals` tests cover any new component
  folder.

Tests

- AC21: Component tests (Vitest + Testing Library, using the fixture provider) cover: switch visible
  only for Teams (AC1, AC2), mode switching and hint text (AC3, AC4), what is hidden in breakdown
  mode (AC6, AC7), the add-stat menu rule (AC9), chip rendering and selection (AC11-AC13), header
  card content and formatting (AC15-AC17), season change (AC18), and the unknown-team case (AC19).
  Existing tests are not deleted or weakened.
- AC22: `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass in `web/`.

## Out of scope

- Share of team production section, Offense/Defense unit toggle and legend (T16).
- Roster table and sorting (T17); no `getRoster` calls are made by T15.
- Any "coming soon" placeholder for T16/T17 content.
- Responsive and accessibility polish beyond what is listed here (T18), e2e tests (T19), pixel
  fidelity pass (T20).
- League switching, real API provider (T22/T23).
- Linking breakdown team selection to the compare selection (`sel.teams`); they stay independent.
- Changing the Players view in any way.

## Assumptions

- A1 (no human input was requested; defaults chosen from the design, CLAUDE.md and prior tickets).
  Breakdown mode hides the whole compare block (picker, sidebar, compare panel), exactly as the
  design's `isCompare` wrapper does (markup line 40). The picker already hides itself (T08).
- A2: Below the header card nothing is rendered until T16/T17 add their sections (no placeholder),
  so those tickets only add content and do not need to remove anything.
- A3 (least invasive provider addition): the summary stats are league-specific, so they cannot be
  hard-coded in components, and the design's short labels ("Pts / G", "Allowed / G", "TO Diff")
  differ from the team `StatDef.label`s ("Points / G", "Pts Allowed / G", "Turnover Diff"). The data
  layer will therefore mark which team stats are summary stats and give each a short label, delivered
  through the existing `getStatDefs(league, 'teams')` call (an optional field on `StatDef`, in
  definition order), rather than adding a new `DataProvider` method. The NFL team stat definitions
  set it on `ppg`, `ypg`, `papg`, `to`, whose definition order already matches the design order. The
  planner may choose the exact field name; the outcome must satisfy AC16/AC17/AC20, and the T22 API
  contract inherits the field.
- A4: Team chips and the header card use `Entity.badge` for the abbreviation (as the picker does)
  and `Entity.name` for the full name. The meta line appends " · <season>" to `Entity.meta` without
  parsing it, as the design does (`team.meta + ' · ' + st.season`).
- A5: The chip list is all teams from `getEntities(..., 'teams', season)`, in provider order (the
  design uses `allTeams`), not only the teams selected for comparison.
- A6: Values are formatted with the existing `formatStat` (design `tf` matches it for these stats:
  decimals via `toFixed`, sign for `signed`). Null/missing shows "—" (README rule for N/A).
- A7: Unknown `teamId` (AC19): show no card and no active chip rather than auto-selecting the first
  team, to avoid an effect that dispatches state changes. With the mock data every season contains
  the default team, so this only affects other data sources.
- A8: Add-stat menu (AC9): T09 notes that a ticket hiding the sidebar must dispatch
  `closeAddStatMenu` itself. Both routes into breakdown mode (the switch, and a kind change to Teams
  while `teamMode` is `inside`) must end with `addStatOpen === null`. Whether this is done by
  dispatching `closeAddStatMenu` or by extending a reducer case is the planner's choice; if a reducer
  case changes, its tests are updated, not weakened.
- A9: Switch accessible name "Team view"; chip group accessible name "Teams". Switch and hint use
  the existing light `SegmentedControl` (track `#F2F2EF`, radius 9, pad 3, item padding `7px 16px`)
  and hint 13px `#7A7A75`. Hint/label words ("teams", "team", "players") are generic, not
  league-specific.
- A10: The global nav (kind tabs, season select) stays visible and functional in breakdown mode.
- A11: `teamMode` and `teamId` are not reset by season or kind changes (T06 behaviour, design does
  the same).
- A12: The design's "Sample data for design purposes." footer is not part of T15.
- A13 (autobuild): planner's open questions resolved by defaults: StatDef.summaryLabel accepted as provider contract; unknown teamId shows no card (no auto-select); shared Chip reused as-is (pill-shaped), exact team-chip styling (radius 8, 7px 12px) deferred to T20; one-time closeAddStatMenu in TeamBreakdown.

## Open questions

None blocking. Non-blocking, for the human to confirm later:
1. Is adding an optional summary field to `StatDef` (A3) acceptable as the provider contract, or
   should summary stats live in `LeagueUiDefaults` / a dedicated provider method?
2. Unknown team (A7): keep "no card", or auto-select the first team?
