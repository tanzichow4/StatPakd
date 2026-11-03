# T08 requirements: Entity cards and add popover

Source ticket: `docs/tickets/T08-entity-picker.md` (its acceptance criteria are the contract).
References: handoff `design_handoff_statpakd/README.md` section 2 "Content container", section 4
"Picker cards row" and "Add popover", "Interactions & Behavior" and "Design Tokens"; design markup
`design_handoff_statpakd/design/StatPakd App.dc.html` lines 31 (container), 42-62 (picker row, add
card, popover) and script lines 366-372 (cards, search filter, Add/Remove CTA), 456-460
(`kindSingular`, `slotsLeft`, `toggleAdd`, `posChips`). Merged building blocks:
`web/src/components/ui/` (`Chip`, `IconButton`, `Pill`), `web/src/styles/tokens.css` and
`web/src/styles/series.ts` (`seriesColor(index)`), `web/src/domain/` (`Entity`, `DataProvider.getEntities`),
`web/src/dataSource/` (`useDataProvider`), `web/src/state/` (`useAppState`; actions `toggleEntity`,
`toggleAdd`, `closeAdd`, `setQuery`, `setPos`; `MAX_SELECTED`, `ALL_POSITIONS`),
`web/src/components/nav/useNavData.ts` (how the active league is chosen today), `web/src/App.tsx`.

## Goal

Below the global nav, show a row of cards for the entities selected for the current kind (one card
per entity, top border in its series colour, with a remove button) followed by an add card while
fewer than 8 are selected. The add card opens a popover where the user searches the current
kind/season's entities by name or team, filters players by position chips that come from the data,
and adds or removes entities, all usable by keyboard alone and at 375px and 1280px widths.

## Design values to match (from handoff section 4 and the design markup)

- Content container (`<main>` child area): `max-width: 1360px`, centred, padding `24px 28px 40px`,
  flex column, gap 24px, `box-sizing: border-box`.
- Picker row: CSS grid `repeat(auto-fill, minmax(220px, 1fr))`, gap 12px.
- Entity card: border `1px solid #E3E3E0`, top border `4px solid <series colour>`, radius 12px,
  padding `16px 18px`, flex column, gap 10px. Top line: big text (Geist Mono 40px / 600,
  letter-spacing -0.04em, line-height 1) on the left, remove button on the right. Remove button:
  26px circle, bg `#F2F2EF` (hover `#E6E6E2`), no border, text "×" 14px colour `#555`. Below: name
  17px / 600 and meta 13px `#7A7A75`, 2px gap.
- Add card: full-size button, min-height 124px, border `1.5px dashed #CFCFCB` (hover border `#111`),
  radius 12px, bg `#FAFAF8`, centred column with gap 4px: "+" (24px / 400, line-height 1),
  "Add player" or "Add team" (14px / 600, `#111`), "N of 8 slots open" (12px / 400, `#7A7A75`).
- Popover: anchored under the add card (`top: calc(100% + 8px)`, left aligned to the add card),
  width 360px, `max-width: 90vw`, bg `#fff`, border `1px solid #DEDEDA`, radius 12px, shadow
  `0 12px 32px rgba(0,0,0,.12)`, padding 12px, flex column, gap 10px, above other content.
  - Top row (gap 8px): search input (flex 1, border `1px solid #DEDEDA`, radius 8px, padding
    `9px 12px`, 14px, focus border `#111`) and "Done" button (no border, bg `#F2F2EF`, radius 8px,
    padding `0 12px`, 13px / 600).
  - Players only: chip row (gap 6px, wraps if needed): pill chips, padding `4px 10px`, radius 999px,
    12px / 600; active bg `#111`, text `#fff`, border `#111`; inactive bg `#fff`, text `#111`,
    border `#DADAD6`.
  - Results list: flex column, gap 2px, `max-height: 340px`, vertical scroll. Row: padding `7px 8px`,
    radius 7px, gap 10px, hover bg `#F6F6F3`. Tile 30x30px, radius 6px, bg `#F0F0ED`, Geist Mono
    11px / 600, colour `#444`, showing `entity.badge`. Name 14px / 500, meta 12px `#7A7A75`
    (truncated rather than overflowing). CTA (radius 6px, padding `5px 12px`, 12px / 600): "Add" =
    bg `#111`, text `#fff`, border `#111`; "Remove" = bg `#fff`, text `#111`, border `#DADAD6`.
  - Empty: "No matches." centred, padding 20px, 13px, `#7A7A75`.
- Colours, radii and shadows come from the existing tokens in `web/src/styles/tokens.css` where a
  token exists; series colours come from `seriesColor(index)`.

## Acceptance criteria

Data loading

- AC1: The entity list shown by the picker is loaded through `useDataProvider()` with
  `getEntities(activeLeagueId, state.kind, state.season)`, where the active league is the same one
  the nav treats as active (first enabled league from `getLeagues`). The picker components and the
  loading hook do not import from `web/src/data/` or reference `MockProvider` (checked by a source
  test like `components/nav/noLeagueLiterals.test.ts`).
- AC2: When `kind` or `season` changes, the list is reloaded; entities loaded for a previous
  kind/season/league are never rendered after the change (a test with a deferred provider resolving
  out of order shows only the latest request's data).
- AC3: If `getEntities` rejects, the picker treats the list as empty: no crash, no cards for
  unresolvable ids, and an open popover shows "No matches.".
- AC4: Picker source files contain no quoted league literals (league ids/names, seasons, stat keys,
  entity ids, or the position strings QB/RB/WR/TE), checked by a source-scan test covering every
  new picker file, in the style of `components/nav/noLeagueLiterals.test.ts`.

Cards row

- AC5: With the app at its default state (MockProvider), directly below the nav there is a picker
  row showing one card per id in `state.sel[state.kind]`, in selection order, followed by the add
  card. Default Players view shows 3 entity cards then the add card reading "Add player" and
  "5 of 8 slots open".
- AC6: Card N (0-based selection index N) has a 4px top border coloured `seriesColor(N)`. Removing
  the first of three cards makes the former second card take series colour 1 (index 0) and the
  former third take index 1. Adding a new entity gives it the colour for index `sel.length - 1`.
- AC7: Each card shows `entity.badge` as the big text, `entity.name`, and `entity.meta`, and has a
  remove button with accessible name "Remove <entity name>". Activating it dispatches
  `toggleEntity` for that id and the card disappears.
- AC8: The add card text uses the kind: "Add player" when kind is players, "Add team" when kind is
  teams; the slots line reads "<8 - selected> of 8 slots open" (8 = `MAX_SELECTED`, not a separate
  literal).
- AC9: The add card is not rendered when 8 entities of the current kind are selected; it reappears
  as soon as one is removed.
- AC10: Players and teams keep separate selections: switching the nav to Teams shows the team
  cards (default 3) with "Add team"; switching back shows the player cards unchanged.
- AC11: The picker row is shown when kind is players, and when kind is teams with
  `teamMode === 'compare'`; it is not rendered when kind is teams and `teamMode === 'inside'`.

Add popover

- AC12: Activating the add card (click, Enter, or Space) dispatches `toggleAdd`; the popover opens
  and the search input receives focus immediately. The add card exposes `aria-expanded`
  (true/false) and the popover is labelled (for example `role="dialog"` with an accessible name).
  Opening clears any previous query (existing reducer behaviour).
- AC13: The search input has an accessible label and placeholder "Search players or team" (players)
  or "Search teams" (teams). Typing dispatches `setQuery` and the results update on each keystroke.
- AC14: Search is case-insensitive, ignores leading/trailing whitespace, and keeps an entity when
  the query is a substring of its `name` OR of its team text, where team text is `entity.teamId`
  for entities that have one and `entity.shortName` for entities without `teamId` (teams). An
  empty query keeps every entity. Examples with mock data: "allen" finds Josh Allen; "BUF" finds
  the players whose `teamId` is the Buffalo team; on Teams, "kc" finds the Kansas City team by its
  short name and "chiefs" finds it by name.
- AC15: Position chips appear only when kind is players. The chips are "All" (`ALL_POSITIONS`)
  followed by the distinct `entity.position` values of the loaded player list in order of first
  appearance (mock data yields All, QB, RB, WR, TE). Entities with no position add no chip. Using
  a fixture provider with invented positions shows those positions instead.
- AC16: Activating a chip dispatches `setPos`; the active chip has the active style and
  `aria-pressed="true"` (others `false`). With a position other than All, only entities whose
  `position` equals it are listed; the position filter combines with the search (AND).
- AC17: Each result row shows tile (`badge`), name, meta, and one CTA button. For an unselected
  entity the CTA reads "Add" with accessible name "Add <name>"; for a selected entity it reads
  "Remove" with accessible name "Remove <name>". Activating either dispatches `toggleEntity`; the
  row's CTA flips and the cards row updates while the popover stays open (unless AC19 applies).
- AC18: When 8 are selected and the popover is rendered (reachable in a component test), every
  "Add" CTA is disabled (native `disabled`) while "Remove" CTAs stay enabled.
- AC19: Adding the 8th entity closes the popover (reducer sets `addOpen` false) and hides the add
  card.
- AC20: When no entity matches the query and position, the list area shows "No matches." and no
  rows.
- AC21: The results list scrolls vertically inside the popover once it exceeds 340px; the page
  itself does not grow to show all rows.

Closing and focus

- AC22: The popover closes on: "Done" (dispatches `toggleAdd`), activating the add card again
  (`toggleAdd`), or Escape pressed while focus is anywhere inside the popover or on the add card
  (dispatches `closeAdd`). Escape while the popover is closed does nothing.
- AC23: After closing via Done, Escape, or the add card, keyboard focus is on the add card button.
- AC24: When the popover closes because the 8th entity was added (add card no longer exists),
  focus moves to the remove button of the last entity card, never to `<body>`.
- AC25: After a card's remove button removes an entity, focus moves to the remove button of the
  card now at the same position, else the previous card's remove button, else the add card;
  focus never falls to `<body>`.
- AC26: Switching kind in the nav while the popover is open closes it (existing `setKind`
  behaviour) and resets the search and position filter; focus is not forced back to the picker in
  this case.

Keyboard-only operation

- AC27: Using only Tab, Shift+Tab, Enter, Space and Escape, a user can: reach each card's remove
  button and the add card in visual order; open the popover; type a query; move to each chip and
  toggle it; move to each result's CTA and add or remove; activate Done; and close with Escape.
  Every interactive element shows a visible focus indicator.
- AC28: All picker controls are native `<button>` / `<input>` elements (or the merged UI primitives
  that render them); no click handlers on non-focusable elements.

Layout and responsiveness (checked in a browser with `npm run dev`)

- AC29: At 1280px viewport width, the default Players view shows the 3 entity cards and the add
  card on a single row below the nav, aligned to the content container (28px side padding); the
  open popover is 360px wide, appears under the add card, overlays content below it, and is not
  clipped.
- AC30: At 375px viewport width, cards stack one per row at full container width; the open popover
  fits within the viewport (no horizontal page scrollbar, no part off-screen), the chips wrap
  instead of overflowing, and long names/meta in results truncate rather than pushing the CTA out.
- AC31: Visual values match the "Design values to match" list above (spot-checked in devtools:
  card border/top border colours, add card dashed border and min-height, popover width, border,
  radius, shadow, results max-height).

App composition and tests

- AC32: `App.tsx` renders, inside `DataSource` and `AppStateProvider`, the `GlobalNav` and then a
  `<main>` containing the content container with the picker row as its first visible child. The
  existing "StatPakd" heading stays in the DOM (visually hidden is acceptable) so
  `App.test.tsx` and `App.nav.test.tsx` pass unchanged. `/dev` still renders DevPage.
- AC33: Component tests (Vitest + Testing Library, fixture provider with invented data) cover:
  add, remove (card and popover), search by name, search by team text, position filter, full (8
  selected: add card hidden, Add disabled, popover closed), empty ("No matches."), Escape closing,
  focus returning to the add card, autofocus of the search input, and series colour order.
- AC34: `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` all pass; no existing
  test is deleted or weakened.

## Out of scope

- Stat sidebar, Table/2D/3D tabs and views, readout (T09/T10 and later).
- Teams mode switch ("Compare teams" / "Team breakdown") UI and the team breakdown screen; T08 only
  respects the existing `teamMode` value (AC11).
- Adding a jersey-number field (or any field) to the `Entity` domain type or to the mock data.
- Closing the popover on outside click or on focus leaving it; focus trapping inside the popover;
  arrow-key navigation within the results list or chips.
- Debouncing search, fuzzy matching, highlighting matches, sorting results (results keep provider
  order).
- Loading spinners or skeletons; error messages beyond the empty state.
- League switching (only the first enabled league is used, as in T07).
- Drag-to-reorder cards.
- Persisting selection across reloads.

## Assumptions

1. Active league: the picker uses the same rule as `useNavData` (first enabled league from
   `getLeagues`). The planner may share that logic, but the nav's observable behaviour must not
   change.
2. Card big text: the handoff shows the jersey number ("#17") for players, but the merged `Entity`
   type has no number field and the mock data sets `badge` to the position. The card shows
   `entity.badge` (so players show e.g. "QB", teams their abbreviation); the number remains visible
   in `meta`. The UI does not parse `meta`.
3. Team match: "team" means `entity.teamId` for players (mock values are lower-case abbreviations,
   matched case-insensitively) and `entity.shortName` for team entities (no `teamId`). Full team
   names are not matched for players (would need a second `getEntities` call for teams).
4. Search placeholder: the design's literal "Search {kind} or team" reads oddly for teams, so it is
   "Search players or team" for players and "Search teams" for teams.
5. Position chips are derived from the loaded player list, not from stat definitions or a constant;
   "All" is the existing `ALL_POSITIONS` value. If the active `state.pos` is not among the chips
   (e.g. after a season change), the filter still applies as stored; no auto-reset is added.
6. Escape is handled while focus is inside the popover or on the add card, not as a global
   document listener, to avoid clashing with future menus (e.g. the "+ Add stat" menu).
7. The popover is non-modal (no focus trap, no backdrop); Tab can leave it and it stays open.
8. While the entity list is loading (or for selected ids not present in the loaded list), no card
   is rendered for those ids, but the slots line still counts `state.sel[kind].length`, and series
   colour stays tied to the index in `state.sel[kind]` so colours do not shift when data arrives.
9. Focus targets when the add card is gone or a card is removed are as in AC24 and AC25 (not
   specified by the handoff; chosen so focus never drops to `<body>`).
10. The visible "StatPakd" `<h1>` from T07 stays but may be visually hidden, because existing tests
    query it and tests must not be weakened.
11. The disabled-Add-at-8 state is normally unreachable in the UI (the popover auto-closes and the
    add card is hidden), so it is verified by a component test rendering the popover with 8
    selected.
12. Picker visibility for teams uses the existing `teamMode` state; its default is `compare`, so
    the picker shows on Teams until a later ticket adds the mode switch.

## Open questions (none blocking; defaults above are applied)

1. Should the `Entity` type gain an optional display field (e.g. jersey number) so player cards can
   show "#17" as in the handoff? Default: no; cards show `badge` (Assumption 2).
2. Should a player search for a full team name (e.g. "Bills") match that team's players? Default:
   no; only `teamId` is matched (Assumption 3).
3. Should clicking outside the popover close it? Default: no, matching the design prototype.
