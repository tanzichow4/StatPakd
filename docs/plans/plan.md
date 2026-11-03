# Plan: T08 Entity cards and add popover

Source: `docs/tickets/T08-entity-picker.md`, requirements `docs/plans/00-requirements.md` (the
contract, including its "Design values to match" list and Assumptions 1-12, which this plan
adopts unchanged). Run non-interactively: the recorded assumptions stand in for answers.

## 1. Goal and out of scope

Below the global nav, show a row of cards for the entities selected for the current kind (series
colour top border, badge, name, meta, remove button), followed by an add card while fewer than 8
are selected. The add card opens a popover with autofocused search, position chips (players only)
and Add/Remove per result, all keyboard-operable and usable at 375px and 1280px.

Out of scope (from requirements): stat sidebar, Table/2D/3D views and readout; teams mode switch
UI and team breakdown screen (only the existing `teamMode` value is respected); new fields on
`Entity` or mock data; closing on outside click or focus leaving; focus trap; arrow-key navigation;
debounce, fuzzy match, highlighting, sorting; spinners/skeletons and error messages beyond the empty
state; league switching; drag-to-reorder; persisting selection.

## 2. Acceptance criteria

AC1-AC34 are exactly as written in `docs/plans/00-requirements.md` (same numbers, same text). They
are not duplicated here to avoid drift; tasks below cite them by number. Summary index:

- Data loading: AC1 (via `useDataProvider().getEntities(activeLeagueId, kind, season)`, no
  `data/` imports), AC2 (reload on kind/season, stale responses never rendered), AC3 (rejection =
  empty list, "No matches."), AC4 (no league literals in picker sources, source-scan test).
- Cards row: AC5 (default 3 cards + "Add player", "5 of 8 slots open"), AC6 (series colour by
  selection index), AC7 (badge/name/meta, "Remove <name>"), AC8 (kind text, `MAX_SELECTED`), AC9
  (add card hidden at 8), AC10 (separate players/teams selections), AC11 (hidden when teams +
  `inside`).
- Popover: AC12 (open, autofocus, `aria-expanded`, labelled dialog), AC13 (label + placeholder,
  `setQuery`), AC14 (search rules), AC15 (chips from data), AC16 (chip filter, `aria-pressed`, AND),
  AC17 (row + CTA flips, stays open), AC18 (Add disabled at 8), AC19 (8th add closes), AC20
  ("No matches."), AC21 (340px scroll).
- Closing and focus: AC22 (Done / add card / Escape), AC23 (focus to add card), AC24 (focus to last
  card's remove at 8), AC25 (focus after card removal), AC26 (kind switch closes, no forced focus).
- Keyboard: AC27 (full keyboard flow, visible focus), AC28 (native buttons/inputs only).
- Layout: AC29 (1280px), AC30 (375px), AC31 (design values).
- Composition and tests: AC32 (`App.tsx`, heading kept, `/dev`), AC33 (component test coverage),
  AC34 (test/lint/typecheck/build pass).

Added:

- **AC35 (added):** The open popover never extends past the right edge of the viewport, whatever
  column the add card sits in (e.g. at 1280px with 4 cards selected the add card is in the 5th
  grid column; a 360px popover left-aligned to it would overflow by about 90px). When it would
  overflow, it shifts left so its right edge is at least 8px inside the viewport, but never left of
  8px from the viewport's left edge. Gap found: AC29 only checks the default 3-card layout.

## 3. Architecture

### Approach

A container component `EntityPicker` reads `useAppState()` and a new `useEntities(kind, season)`
hook, derives cards and filtered results with pure helpers, and renders presentational children
(`EntityCard`, `AddCard`, `AddPopover`). All state stays in the existing reducer (`sel`, `q`, `pos`,
`addOpen`); no reducer changes. Focus is managed in `EntityPicker` with refs (section 3, "Focus
management").

### Files (all new unless marked)

`web/src/dataSource/`
- `activeLeague.ts`: `export function firstEnabledLeagueId(leagues: League[]): LeagueId | null`.
- `useActiveLeagueId.ts`: `export function useActiveLeagueId(): LeagueId | null` (calls
  `provider.getLeagues()` with a cancelled flag; rejection gives `null`; returns
  `firstEnabledLeagueId(leagues)`).
- `index.ts` (modified): also export both of the above.
- `web/src/components/nav/useNavData.ts` (modified, one line): compute `activeLeagueId` with
  `firstEnabledLeagueId(leagues)`. Observable nav behaviour unchanged (Assumption 1). This means
  the nav and picker each call `getLeagues` once; acceptable for the mock and noted for T22.

`web/src/components/picker/`
- `filterEntities.ts` (pure, no React):
  - `teamText(e: Entity): string` returns `e.teamId ?? e.shortName`.
  - `matchesQuery(e: Entity, q: string): boolean` (trim + lower-case; empty query matches; substring
    of `name` or `teamText`).
  - `positionChips(entities: Entity[]): string[]` returns `[ALL_POSITIONS, ...distinct positions in
    first-appearance order]`, skipping entities with no position.
  - `filterEntities(entities: Entity[], q: string, pos: string): Entity[]` (query AND position;
    `pos === ALL_POSITIONS` means no position filter; keeps provider order).
  - `kindSingular(kind: EntityKind): string` returns `'player'` or `'team'` (kind values are domain
    values, not league literals).
  - `popoverShift(anchorLeft: number, width: number, viewportWidth: number, margin = 8): number`
    returns the number of px to move the popover left (0 when it fits). Covers AC35.
- `useEntities.ts`: `export function useEntities(kind: EntityKind, season: Season): Entity[]`.
  Uses `useDataProvider()` and `useActiveLeagueId()`. Stores
  `{ key: { leagueId, kind, season }, entities }` on resolve, or the same key with `[]` on reject,
  behind a per-effect `cancelled` flag. Returns `loaded.entities` only when the stored key equals
  the current `(leagueId, kind, season)`, else `[]` (AC2, AC3). Same pattern as `useNavData`.
- `EntityCard.tsx` + `EntityCard.module.css`: props `{ entity: Entity; colorIndex: number;
  onRemove: () => void; removeRef?: Ref<HTMLButtonElement> }` (React 19 `ref`-as-prop style is fine
  for a callback ref prop). Root `<li>` with inline `style={{ borderTopColor:
  seriesColor(colorIndex) }}`; CSS sets the 4px top border width/style and the rest of the card
  values. Remove control is a native `<button type="button" aria-label={`Remove ${entity.name}`}>`
  with `<span aria-hidden="true">×</span>`, styled in this module (26px, `#555`, 14px). Reason for
  not reusing `IconButton`: it cannot take a ref (needed for AC24/25) and its colour/size differ;
  changing the shared primitive is avoided.
- `AddCard.tsx` + `AddCard.module.css`: props `{ kind; selectedCount; expanded; popoverId; onToggle;
  onEscape; buttonRef }`. Native `<button type="button" aria-expanded aria-haspopup="dialog"
  aria-controls={expanded ? popoverId : undefined}>`, "+" in an `aria-hidden` span, then
  "Add player|team" and "`{MAX_SELECTED - selectedCount}` of `{MAX_SELECTED}` slots open". Accessible
  name therefore starts with "Add player" / "Add team". `onKeyDown`: Escape calls `onEscape` only
  when `expanded`.
- `AddPopover.tsx` + `AddPopover.module.css`: presentational, rendered only while open. Props
  `{ id; kind; results: Entity[]; chips: string[] | null; q; pos; selectedIds: EntityId[]; full:
  boolean; onQuery; onPos; onToggleEntity(id); onDone; onEscape; shiftLeft?: number }`.
  - Root `<div id role="dialog" aria-label="Add player|team" onKeyDown>`; Escape calls `onEscape`
    and `stopPropagation()`. jsx-a11y allows key handlers on `role="dialog"`; if oxlint still flags
    it, attach a `keydown` listener through a ref in an effect instead (no disable comments).
  - Search: `<input type="search" aria-label="Search players|teams" placeholder=...>` (placeholder
    "Search players or team" / "Search teams", Assumption 4). Focused in a `useEffect` on mount via
    ref (not the `autoFocus` attribute, which jsx-a11y warns on).
  - Chips (only when `chips` is non-null, i.e. players): `<div role="group" aria-label="Filter by
    position">` of native `<button type="button" aria-pressed>` styled in this module (the shared
    `Chip` has different padding/size and no className prop).
  - Results: `<ul aria-label="Results">` with `max-height: 340px; overflow-y: auto`. Row `<li>`:
    tile `<span aria-hidden="true">{badge}</span>`, text block (`min-width: 0`, name/meta with
    `nowrap; overflow: hidden; text-overflow: ellipsis`), CTA `<button>` with visible "Add"/"Remove"
    and `aria-label` "Add <name>"/"Remove <name>"; Add gets native `disabled` when `full` (AC18).
  - Empty: `<p>No matches.</p>` instead of the list when `results` is empty (AC20, AC3).
  - "Done" `<button type="button">` calls `onDone`.
- `EntityPicker.tsx` + `EntityPicker.module.css`: the container (see flow and focus below). Renders
  `null` when `kind === 'teams' && teamMode === 'inside'` (AC11). Otherwise
  `<ul className={styles.row} aria-label="Selected players|teams">` of `EntityCard`s, then an
  `<li className={styles.addCell}>` (position: relative) holding `AddCard` and, when
  `state.addOpen`, `AddPopover`. Uses `useId()` for the popover id.
- `index.ts`: `export { EntityPicker } from './EntityPicker'`.

`web/src/App.tsx` (modified) + `web/src/App.module.css` (new): `<main className={styles.content}>`
with `<h1 className={styles.srOnly}>StatPakd</h1>` then `<EntityPicker />`. `.content` = max-width
1360px, centred, padding `24px 28px 40px`, flex column, gap 24px. The `<h1>` stays in the DOM
(AC32, Assumption 10). `/dev` branch unchanged.

`web/src/test/fixtureProvider.ts` (modified, additive only): `fixturePlayers(): Entity[]` (at least
10 invented players: ids `zp1`..`zp10`, invented positions such as `ZA`, `ZB`, `ZC` with one player
lacking `position`, `teamId` values `zt1`/`zt2`, distinct names such as "Ola Quenby") and
`fixtureTeams(): Entity[]` (ids `zt1`..`zt4`, `shortName` like `ZQA`, no `teamId`), plus
`entitiesProvider(overrides?)` returning `createFixtureProvider` with `getEntities` resolving by
kind. Existing exports untouched.

### Card and colour derivation (in `EntityPicker`)

`state.sel[kind].map((id, index) => ({ id, index, entity: byId.get(id) }))`, then drop rows with no
entity. `colorIndex` is the index in `state.sel[kind]` (Assumption 8); visible position is the
position among the kept rows. Slots line uses `state.sel[kind].length`. `full = sel.length >=
MAX_SELECTED`.

### Focus management (in `EntityPicker`)

- Refs: `addCardRef` (button), `removeRefs = useRef(new Map<EntityId, HTMLButtonElement>())` filled
  by callback refs on each card, and `pendingFocus = useRef<null | { to: 'lastCard' } | { to:
  'removeAt'; position: number }>(null)`.
- Close via Done / Escape (popover or add card): dispatch (`toggleAdd` for Done, `closeAdd` for
  Escape) and call `addCardRef.current?.focus()` immediately; the add card exists before and after
  closing (AC23). Closing via the add card itself leaves focus on it.
- Popover CTA that adds the 8th entity (`!selected && sel.length === MAX_SELECTED - 1`): set
  `pendingFocus = { to: 'lastCard' }` before dispatching `toggleEntity` (AC24).
- Card remove at visible position `p`: set `pendingFocus = { to: 'removeAt', position: p }`, then
  dispatch `toggleEntity` (AC25).
- A `useEffect` with deps `[state.sel, state.kind, state.addOpen, visibleCards]` consumes
  `pendingFocus`: `lastCard` focuses the last visible card's remove button; `removeAt` focuses
  visible[p], else visible[p - 1], else `addCardRef`. Clears the ref after use.
- Opening: `AddPopover` focuses its input on mount (AC12).
- Kind switch (AC26): no pending focus is set; the popover unmounts by reducer. Nothing forced.

### Popover overflow (AC35)

In `EntityPicker`, a `useLayoutEffect` when `addOpen` becomes true (and on window `resize` while
open) measures `addCardRef.current.getBoundingClientRect().left` and the popover width, computes
`popoverShift(...)`, and passes it as `shiftLeft`, applied as inline `left: -shiftLeft px`.
Remove the resize listener on close/unmount.

### Data/API changes and dependencies

No changes to `domain/`, the reducer, `DataProvider`, or mock data. No new dependencies. No new
env vars or config.

## 4. Design

### User flow

1. Page loads: nav, then content container; cards appear once entities resolve (no spinner; the add
   card is visible immediately with the slots count from state).
2. User activates add card: popover opens under it, search focused, query cleared.
3. User types and/or toggles a position chip; list updates per keystroke.
4. User presses Add/Remove on rows; cards row updates live; popover stays open.
5. User closes with Done, Escape, or the add card; focus returns to the add card. If the 8th entity
   is added, the popover and add card disappear and focus lands on the last card's remove button.
6. User removes a card with its × button; focus moves per AC25.

### States

- Loading: no cards for unresolved ids; add card shows correct slots; open popover shows "No
  matches." (accepted per out-of-scope "no spinners").
- Empty list / rejected `getEntities`: same as loading, no crash (AC3).
- No matches: "No matches." centred (AC20).
- Success: cards + results as designed.
- Full (8): add card hidden (AC9), popover closed (AC19), Add CTAs disabled if the popover is ever
  rendered (AC18).
- Teams + `inside`: picker not rendered (AC11).

### Widths

- 1280px: grid `repeat(auto-fill, minmax(220px, 1fr))` gives 5 columns in the 1304px-wide padded
  container; default 3 cards + add card on one row; popover 360px under the add card (AC29, AC35).
- 375px: one column at container width (319px); popover `max-width: 90vw` (337.5px) starts at 28px
  so its right edge is at about 365px, inside the viewport; chips wrap (`flex-wrap: wrap`); result
  text truncates (AC30). No horizontal scroll.

### Accessibility

Native buttons/inputs only (AC28); `aria-expanded`/`aria-controls`/`aria-haspopup` on add card;
`role="dialog"` with `aria-label`; search with `aria-label`; chips `aria-pressed`; CTAs and remove
buttons with entity-specific names; decorative "+", "×", tiles `aria-hidden`; visible focus from the
global `:focus-visible` outline (do not set `outline: none` anywhere); DOM order equals visual order
for Tab (AC27). Non-modal popover (Assumption 7).

## 5. Risk and security

- Input validation: the query is only used for in-memory substring matching and rendered as React
  text; no `dangerouslySetInnerHTML`, no regex built from user input (use `includes`). Task: T3.
- Auth / data exposure: none; client-only, read-only data from the provider. No new network calls
  except `getLeagues`/`getEntities` through the existing provider.
- Failure modes and safeguards:
  - Out-of-order responses: keyed result in `useEntities` (T4, test with `deferred`).
  - Rejection: caught, becomes `[]` (T4, test).
  - Unmount mid-request: `cancelled` flag prevents state updates (T4).
  - Selected ids missing from data: skipped, colours stable (T7, test).
  - Focus lost to `<body>`: explicit targets (T7, tests for AC23-25).
  - Popover overflow at right edge: `popoverShift` (T3 unit test, T7, QA check).
  - Escape bubbling into future menus: `stopPropagation` in popover handler; no document listener
    (Assumption 6).
  - League literal creep: source-scan test (T9).

## 6. Gaps check

- Auth: not applicable (no auth in app yet).
- Validation: query trimmed/lower-cased, no regex; reducer already guards `MAX_SELECTED`.
- Error handling: provider rejection handled in hook; no error UI (out of scope).
- Mobile: 375px behaviour specified; AC35 added for right-edge overflow.
- Accessibility: section 4.
- Config/env vars: none needed.
- Tests: unit (helpers), hook, components, App integration, source scan; QA browser list below.

## 7. Tasks

Test rules for every test file (oxlint): no message argument to `expect`, no `expect` inside `if`
or other conditionals (use `it.each` or separate tests), every test contains at least one visible
`expect(...)` (a bare `await screen.findBy...` is not enough; wrap it in `expect(...)`). Use
`userEvent.setup()`; flush effects with `await act(async () => {})` where a test ends after async
work. Do not touch existing tests.

- **T1** (AC1): `dataSource/activeLeague.ts`, `useActiveLeagueId.ts`, exports in
  `dataSource/index.ts`; `useNavData` uses `firstEnabledLeagueId`. Test
  `web/src/dataSource/activeLeague.test.ts` (first enabled, none enabled gives null, empty list).
  Existing nav tests must pass unchanged.
- **T2** (AC33): fixture entities and `entitiesProvider` in `web/src/test/fixtureProvider.ts`
  (additive).
- **T3** (AC8, AC14, AC15, AC16, AC35): `components/picker/filterEntities.ts` +
  `filterEntities.test.ts`: name match, team-text match via `teamId`, via `shortName` for teams,
  case/whitespace, empty query, chips order and no-position skip, invented positions, AND filter,
  `kindSingular`, `popoverShift` (fits = 0, overflow shifted, clamped at left margin).
- **T4** (AC1, AC2, AC3): `components/picker/useEntities.ts` + `useEntities.test.tsx` (`renderHook`
  with a `DataSource` wrapper; asserts `getEntities` called with fixture league id/kind/season;
  rerender to new kind/season with two `deferred`s resolved out of order shows only latest; reject
  gives `[]`).
- **T5** (AC6, AC7, AC8, AC9, AC31): `EntityCard` and `AddCard` with CSS modules.
- **T6** (AC12, AC13, AC15-AC18, AC20, AC21, AC31): `AddPopover` with CSS module, plus
  `AddPopover.test.tsx` rendered directly: input focused on mount, placeholder per kind, no chips
  for teams, chip `aria-pressed`, `full` disables every "Add" but no "Remove", "No matches." when
  empty, Escape and Done call handlers.
- **T7** (AC5, AC6, AC10, AC11, AC17, AC19, AC22-AC27, AC35): `EntityPicker` container, focus
  management, popover shift, `index.ts`.
- **T8** (AC29, AC30, AC32): `App.tsx` composition + `App.module.css`.
- **T9** (AC1, AC4): `components/picker/noLeagueLiterals.test.ts`, copying the nav test's
  `leagueValues`/`findHits` approach, importing every picker source with `?raw` (`EntityPicker.tsx`,
  `EntityCard.tsx`, `AddCard.tsx`, `AddPopover.tsx`, `useEntities.ts`, `filterEntities.ts`,
  `index.ts`) plus `dataSource/useActiveLeagueId.ts` and `dataSource/activeLeague.ts`; asserts no
  `/data/` import, no `MockProvider`, `useEntities` contains `useDataProvider`, planted-literal
  check.
- **T10** (AC33 and AC5-AC26): `components/picker/EntityPicker.test.tsx` with `DataSource` +
  `AppStateProvider` (fixture defaults/stat defs) + a `StateProbe` exposing state JSON and buttons
  to dispatch `setKind`, `setTeamMode('inside')`, and to seed selections. Cases: cards in selection
  order with `style.borderTopColor === seriesColor(i)`; remove first card re-colours; add gives
  index `sel.length - 1`; add card text and slots; open via click/Enter/Space sets `aria-expanded`
  and focuses search; search by name; search by team text; position filter + AND; CTA flips and
  stays open; add to 8 closes popover, hides add card, focus on last remove button; card remove
  focus targets (same position, previous, add card); Escape from input and from add card closes and
  focuses add card; Escape when closed leaves state unchanged; Done focuses add card; kind switch
  closes and resets `q`/`pos`; teams keep separate selection; `inside` hides picker; rejected
  `getEntities` with popover open shows "No matches." and no cards; keyboard-only flow with
  `user.tab()` reaching remove buttons then add card in order. Scope duplicate names with
  `within(screen.getByRole('list', { name: /Selected/ }))` vs `within(screen.getByRole('dialog'))`.
- **T11** (AC5, AC10, AC32, AC34): `web/src/App.picker.test.tsx` with the real `App`: 3 cards and
  "Add player"/"5 of 8 slots open" after load, cards inside `<main>` after the banner, Teams switch
  shows 3 team cards and "Add team", back to Players unchanged. Then run `npm test`, `npm run lint`,
  `npm run typecheck`, `npm run build`, `npm run format`.

### Parallel work

The test-writer can start immediately on T2, then write T3, T4, T6, T9, T10, T11 tests against the
exports, file paths and accessible names fixed in section 3, while the coder does T1, T3-T8. Only
the source-scan test (T9) depends on files existing (its `?raw` imports fail until the coder
creates them); land it after T7. The coder should not change accessible names, roles or export
names without updating this plan.

### QA browser checks (`npm run dev`, Chrome devtools device toolbar)

At 1280px:
1. Players: 3 cards and the add card in one row below the nav; left edge of first card 28px from
   the content container edge; container max 1360px centred (AC5, AC29).
2. Card top borders are series colours 1, 2, 3 (`#111`, `#E0472B`, `#2F5FD0`); card border
   `#E3E3E0`, radius 12px (AC6, AC31).
3. Add card: dashed `1.5px #CFCFCB`, hover border `#111`, min-height 124px, "Add player", "5 of 8
   slots open" (AC8, AC31).
4. Click add card: popover 360px wide, border `#DEDEDA`, radius 12px, shadow
   `0 12px 32px rgba(0,0,0,.12)`, overlays content, search focused (AC12, AC29, AC31).
5. Chips All, QB, RB, WR, TE; click RB, only RBs listed; type "allen" with All: Josh Allen; "BUF":
   Buffalo players (AC14-AC16).
6. Results list max-height 340px and scrolls inside the popover; page does not grow (AC21).
7. Add players until 4 are selected, reopen popover: it stays fully inside the viewport (AC35).
   Continue to 8: popover closes, add card gone, focus ring on last card's ×; remove one: add card
   back (AC9, AC19, AC24).
8. Teams: 3 team cards, "Add team", no chips, "kc" and "chiefs" both find Kansas City; back to
   Players unchanged (AC10, AC14, AC15).
9. Type "zzzz": "No matches." (AC20).

At 375px:
10. Cards one per row at full container width; no horizontal scrollbar (AC30).
11. Open popover: fully on-screen, chips wrap, long names/meta truncate with ellipsis, CTA visible
    (AC30).

Keyboard only (mouse untouched), at 1280px and repeated at 375px:
12. Tab from the season select: each card × in order, then add card; each shows a visible focus
    ring (AC27).
13. Enter on add card opens with search focused; type a query; Tab to each chip, Space toggles it
    (`aria-pressed` in devtools); Tab to a result CTA, Enter adds (card appears, popover stays);
    Tab to Done, Enter closes and focus is on the add card (AC12, AC16, AC17, AC22, AC23, AC27).
14. Space on add card opens; Escape closes with focus on add card; Escape again does nothing
    (AC22, AC23).
15. Shift+Tab to a card ×, Enter: card removed, focus on the next card's × (or previous, or add
    card) and never on the page body (check `document.activeElement` in console) (AC25).
16. With popover open, switch kind with the nav control: popover closes; reopening shows empty
    search and All chip (AC26).
17. `/dev` still renders the UI primitives page (AC32).

## 8. Open questions (none blocking; defaults applied)

1. AC35 (added): confirm the popover should shift left rather than right-align to the add card
   when near the edge. Default: shift left by the overflow amount.
2. Should `Entity` gain a jersey-number field so player cards show "#17"? Default: no, show `badge`.
3. Should player search match full team names ("Bills")? Default: no, only `teamId`.
4. Should clicking outside close the popover? Default: no.
5. Nav and picker each call `getLeagues` once. Acceptable for now; a shared leagues context could
   be introduced when the real API (T22) lands. Default: leave as is.
