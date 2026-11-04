# Plan: T15 Teams mode switch, team chips, team header card

Source: `docs/tickets/T15-team-breakdown-header.md`. The contract is `docs/plans/00-requirements.md`:
AC1 to AC22 and assumptions A1 to A12. This plan runs without stopping for approval. The
requirements list no blocking questions, so every default under Assumptions applies.

## 1. Goal and out of scope

Goal: when the entity kind is Teams, show a "Compare teams" | "Team breakdown" switch with hint text.
In Team breakdown mode, replace the compare UI with a row of team chips and a header card for the
chosen team (badge, name, "meta · season" and the summary stats). Everything comes from the
DataProvider for the current season, so the components stay league-agnostic and the card follows
team and season changes.

Out of scope (from the requirements):
- Share of team production, Offense/Defense toggle and legend (T16).
- Roster table and sorting (T17). T15 makes no `getRoster` calls.
- Any "coming soon" placeholder for T16/T17 content.
- Responsive and a11y polish beyond what is listed here (T18), e2e tests (T19), pixel fidelity (T20).
- League switching and the real API provider (T22/T23).
- Linking the breakdown team to the compare selection (`sel.teams`). They stay independent.
- Any change to the Players view.

## 2. Acceptance criteria (copied from 00-requirements.md, same numbers)

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

Added
- AC23 (added): Whenever a season change is in flight (`useEntities` returns `[]` for the stale
  season), the breakdown shows no chips and no card for that moment rather than the previous season's
  data, and it never shows the old meta line with the new season suffix. Gap: AC14 and AC18 did not
  say what shows between the season change and the new load. `useEntities` already behaves this way,
  so this AC pins it with a test.

## 3. Architecture

Approach: follow the earlier pattern of a pure model plus thin components. The breakdown gets its own
league-agnostic folder, `web/src/components/teams/`. App decides which block shows. No reducer
changes: only existing actions are used (`setTeamMode`, `setTeam`, `closeAddStatMenu`).

Domain and data (A3)
- `web/src/domain/types.ts`: add an optional field to `StatDef`:
  `summaryLabel?: string`, with the doc comment "Short label shown in the team header summary. When
  set, the stat is a summary stat. Summary stats show in definition order." This is additive: every
  existing def and caller stays valid, and the T22 API contract inherits it.
- `web/src/data/nfl/statDefs.ts`: set `summaryLabel` on `ppg` ("Pts / G"), `ypg` ("Yds / G"),
  `papg` ("Allowed / G") and `to` ("TO Diff"). Their definition order already matches the design.
  `MockProvider.getStatDefs` returns copies of these defs, so the field reaches the UI with no
  provider change.
- `web/src/test/fixtureProvider.ts`: add new helpers only. Existing fixtures stay unchanged.
  - `fixtureTeamSummaryStatDefs()`: invented team defs. Two have `summaryLabel` (one with
    `decimals: 1`, one `signed`) and are interleaved with plain defs, so order and filtering are
    tested.
  - `seasonTeamsProvider(overrides?)`: teams whose `meta` and stats depend on the requested season.
    It includes a null value and a missing key.
  - Every name is invented (z-prefixed).

New folder `web/src/components/teams/`
- `teamHeaderModel.ts` and `teamHeaderModel.test.ts`. Pure, with no React.
  - `findTeam(entities, teamId): Entity | undefined`.
  - `teamMetaLine(entity, season)` returns `` `${entity.meta} · ${season}` `` (A4, no parsing).
  - `summaryStats(defs, stats)` returns `{ key, label, text }[]`. It keeps defs with a non-empty
    `summaryLabel`, in definition order. `label` is the `summaryLabel` and `text` is
    `formatStat(stats[key], def)`, which already gives `NULL_PLACEHOLDER` for null or missing values
    (AC16, AC17).
  - `teamModeHint(mode, max)` returns the hint string, with `max` passed in as `MAX_SELECTED` (AC3).
- `TeamModeSwitch.tsx`, `.module.css` and `.test.tsx`.
  - Reads `useAppState()` and returns `null` unless `kind === 'teams'` (AC2).
  - Renders a flex row with the `SegmentedControl` (light variant, label "Team view", options
    `compare`/"Compare teams" and `inside`/"Team breakdown") and a `<p>` hint.
  - `onChange` dispatches `setTeamMode` only when the value differs from `state.teamMode` (AC4).
    This avoids a no-op state change that would still close the add popover.
- `TeamChips.tsx`, `.module.css` and `.test.tsx`.
  - Props: `teams: Entity[]`, `activeId`, `onSelect(id)`.
  - Renders `<div role="group" aria-label="Teams">` with one `Chip mono` per team, labelled with
    `badge` and keyed by id (AC11, AC12).
  - `onSelect` fires only for inactive chips (AC13).
- `TeamHeader.tsx`, `.module.css` and `.test.tsx`.
  - Props: `team: Entity`, `season`, `summary` (the `summaryStats` output).
  - Renders a `<section aria-labelledby>`. The left part has the badge (span, mono 44px), an `<h2>`
    with the name, and the meta line. The right part is a `<dl>` with one `<div>` per stat holding a
    `<dt>` (label) and a `<dd>` (mono value).
  - The CSS sets the AC15/AC16 borders, radius, padding and type. The label case comes from
    `text-transform`, so the DOM text stays "Pts / G".
- `TeamBreakdown.tsx`, `.module.css` and `.test.tsx`. This is the container.
  - Data: `useEntities('teams', state.season)` and `useStatDefs('teams')`, reusing the T08/T09 hooks
    from `components/picker` and `components/sidebar`, as `ComparePanel` does.
  - It renders `null` when there are no teams (AC14, AC23). Otherwise it renders `TeamChips`, then
    `TeamHeader` only when `findTeam` finds a team (AC19), inside a column flex with a 22px gap
    (AC7).
  - Selecting a chip dispatches `setTeam` (AC13).
  - On mount, `useLayoutEffect(() => dispatch({ type: 'closeAddStatMenu' }), [dispatch])` runs
    (A8, AC9). This covers both entry paths with one existing action. Path (a) is the switch. Path
    (b) is a kind change while `inside`: there `StatSidebar` unmounts in the same render, so its
    own kind-change effect never runs. The effect runs before paint and is a no-op when the menu is
    already closed, so it is safe under StrictMode.
  - Summary stats wait for the defs: until they load, the card shows without the stats list and
    without a placeholder.
- `index.ts`: exports `TeamModeSwitch` and `TeamBreakdown`.
- `noLeagueLiterals.test.ts`, following the sidebar and compare pattern (AC20).

App wiring (`web/src/App.tsx`)
- Move the main-content body into a small inner component `AppMain` in `App.tsx` (it needs
  `useAppState`, which is only available inside the provider).
  - `breakdown = kind === 'teams' && teamMode === 'inside'`.
  - It renders `<TeamModeSwitch />`. If `breakdown` is true it then renders `<TeamBreakdown />`.
    Otherwise it renders the existing `<EntityPicker />` plus the `.body` div holding the sidebar
    and the "Stat views" section, unchanged (AC1, AC6, AC7).
- The compare UI unmounts, but all of its state (`sel`, `stats`, `view`, `chart2`, `ax`, `yaw`,
  `pitch`) lives in the reducer, so a round trip restores it (AC8). Nothing in T15 dispatches
  anything that changes those fields.
- AC10 needs no change: `setTeamMode` sets `addOpen: false`, and `setKind` does too.
- `EntityPicker`'s own breakdown guard stays, since it is harmless and has its own tests.

Dependencies, config and env: none new. No `.env` or provider-interface method changes.

## 4. Design

User flow: the user clicks the "Teams" tab in the global nav and sees the switch with "Compare
teams" pressed and the hint "Compare up to 8 teams side by side", above the usual compare UI. They
click "Team breakdown": the picker, sidebar and panel disappear, and the hint changes to "Compare
players within one team". Below the switch are the team chips (default team active) and the header
card. Clicking another chip moves the active chip and swaps the card. Changing the season in the nav
reloads the chips and card for that season with the same team. Clicking "Compare teams" restores the
compare UI as it was left.

States
- Loading or failed team entities: the switch and hint are shown, with nothing below them (AC14,
  AC23).
- Team defs still loading or failed: the card shows the badge, name and meta, but no stats list.
- Unknown `teamId`: the chips are shown with none active and no card. Clicking a chip shows its card
  (AC19).
- Empty provider list (`[]`): same as loading, with nothing below the switch.
- Success: the chips and card (AC11-AC17).

Desktop (1280px): the switch and hint sit on one row (gap 14px, `align-items: center`). The chips are
in a wrapping row with a 6px gap. The card is a wrapping flex row with a 22px gap: the badge, the
name/meta block, and the summary list pushed right by `margin-left: auto`, with a 32px gap between
stats.

Mobile (375px): everything wraps, so there is no horizontal scroll.
- The hint drops below the switch.
- The chips wrap onto two or more lines.
- In the card, the summary list wraps under the name block (2x2 or similar), with `min-width: 0` on
  the flex children.
- Long names wrap rather than overflow (`overflow-wrap: anywhere` on the h2).
- Checked manually in T8.

Accessibility
- The switch is a fieldset named "Team view" with `aria-pressed` buttons, from the existing
  component (AC1).
- The chips are a group named "Teams" with `aria-pressed` buttons (AC12). Chip buttons are native, so
  they are reachable by Tab and work with Enter and Space.
- The card is a `section` labelled by its `h2` (the team name). The summary list is a `dl`, so
  screen readers pair each label with its value.
- The hint is plain text next to the switch. No live region is used. The visible content change is
  the feedback, as with the view tabs.
- Focus: when the compare UI unmounts, focus stays on the pressed switch button, which remains in
  the DOM.
- 40px touch targets and an axe sweep are T18.

## 5. Risk and security

- Input validation: all values come from the provider. `formatStat` handles null and missing
  values, and `summaryStats` skips defs without a `summaryLabel`. `findTeam` returning undefined is
  handled (AC19). Safeguard: the model tests cover null, missing, empty `summaryLabel` and unknown
  team (T2).
- Auth and data exposure: none. This is client-side rendering of provider data as React text nodes,
  never as HTML.
- Failure modes and safeguards:
  - A stale add-stat menu after breakdown (AC9 path (b)) is invisible in the DOM when the group
    names differ between kinds, as they do in the NFL data. So the tests assert
    `state.addStatOpen === null` through a state probe, not only the DOM (T5).
  - An entity load failure shows nothing and does not throw (AC14). It is tested with a rejecting
    provider (T5).
  - A season-change race: `useEntities` already drops stale loads. A test resolves the old season
    after the new one and asserts that the new season's data shows (T5, AC18, AC23).
  - Updated expectations: `data/nfl/data.test.ts` (`EXPECTED_TEAM_DEFS`) and
    `data/mockProvider.test.ts` (`teams[6]`) assert exact defs, so they gain the new
    `summaryLabel` values. That is an update to new expected data, with no assertion removed (T1).
  - App tests that assume the sidebar and panel are always present: the default `teamMode` is
    `compare`, so they keep passing unchanged. If any breaks, fix it by scoping, never by loosening
    (T6).
  - League literals: the new folder gets its own scan, which includes team ids, names, badges and
    divisions and the summary labels (T7).

## 6. Gaps check

- Auth: not applicable, since there are no network writes and no user data.
- Validation: null and missing values, empty summary labels, unknown team and failed loads are
  covered (AC14, AC17, AC19).
- Error handling: a load failure shows an empty breakdown under the switch with no throw. A defs
  failure shows the card without stats.
- Mobile: wrapping layout as above, with a manual check at 375px in T8.
- Accessibility: named group and fieldset, `aria-pressed`, a section with a heading, and a `dl`.
  The full audit is T18.
- Config and env vars: none. `.env` is not touched.
- Tests: there are model unit tests, component tests per component, a container test with a state
  probe, App integration tests, the literal scan and the full gate (T1-T8).

## 7. Tasks

Each task is one commit with its tests in the same commit. Paths are under `web/src/`.

- T1: Summary-label field, NFL data and fixtures.
  - Add `summaryLabel?: string` to `StatDef` with a doc comment.
  - Set it on the four NFL team defs.
  - Add `fixtureTeamSummaryStatDefs` and `seasonTeamsProvider` to `test/fixtureProvider.ts`.
  - Tests:
    - Update `EXPECTED_TEAM_DEFS` in `data/nfl/data.test.ts` and `teams[6]` in
      `data/mockProvider.test.ts` to include the labels.
    - Add a test that the team defs with `summaryLabel` are exactly `ppg`, `ypg`, `papg`, `to`
      with labels "Pts / G", "Yds / G", "Allowed / G", "TO Diff", in that order.
    - Add a test that no player def has one.
    - Add a `domain.test.ts` case showing a def with `summaryLabel` is valid and one without is
      still valid.
  - Files: `domain/types.ts`, `domain/domain.test.ts`, `data/nfl/statDefs.ts`,
    `data/nfl/data.test.ts`, `data/mockProvider.test.ts`, `test/fixtureProvider.ts`.
  - ACs: AC16, AC20 (data side).
- T2: Pure header model. Add `components/teams/teamHeaderModel.ts` with `findTeam`, `teamMetaLine`,
  `summaryStats` and `teamModeHint`.
  - Tests:
    - `findTeam` hit and miss.
    - The meta line is exactly `meta · season`.
    - Summary stats keep definition order, skip non-summary and empty-label defs, give one decimal
      for `decimals: 1`, show "+" for a positive signed value and no "+" for zero or negative, and
      show "—" for null and for a missing key.
    - The hint text for both modes, using `MAX_SELECTED` (expects "Compare up to 8 teams side by
      side").
    - Inputs are not mutated.
  - Files: `components/teams/teamHeaderModel.ts`, `components/teams/teamHeaderModel.test.ts`.
  - ACs: AC3, AC15 (meta), AC16, AC17, AC19 (lookup).
- T3: `TeamModeSwitch`. Add the component, its CSS (row gap 14, wrap; hint 13px `#7A7A75`) and tests
  with `AppStateProvider` and fixture defaults plus a state probe.
  - Tests:
    - Players renders no "Team view" group and no hint, in both modes (AC2).
    - Teams renders the buttons in order with the correct `aria-pressed` (AC1).
    - Clicking toggles `teamMode` and the hint text (AC3, AC4).
    - Clicking the active option dispatches nothing: the state object is unchanged and the add
      popover stays open.
  - Files: `components/teams/TeamModeSwitch.tsx`, `TeamModeSwitch.module.css`,
    `TeamModeSwitch.test.tsx`, `components/teams/index.ts`.
  - ACs: AC1, AC2, AC3, AC4, AC21.
- T4: `TeamChips` and `TeamHeader` presentational components and their CSS.
  - Chips tests:
    - One chip per team in order, labelled by badge, with the mono class.
    - Only the active chip is pressed.
    - Clicking an inactive chip calls `onSelect(id)`, and clicking the active chip does not.
    - The group is named "Teams".
    - With an unknown `activeId`, no chip is pressed.
  - Header tests:
    - Badge, `h2` name and meta line text.
    - The section is labelled by the name.
    - The summary `dt`/`dd` pairs are in order, with "—" shown.
    - With no summary, no `dl` is rendered.
  - Files: `components/teams/TeamChips.tsx`, `TeamChips.module.css`, `TeamChips.test.tsx`,
    `TeamHeader.tsx`, `TeamHeader.module.css`, `TeamHeader.test.tsx`.
  - ACs: AC11, AC12, AC13, AC15, AC16, AC17, AC19.
- T5: `TeamBreakdown` container. Wire `useEntities` and `useStatDefs`, `findTeam` and
  `summaryStats`, `setTeam`, and the mount-time `closeAddStatMenu`.
  - Tests use the fixture providers with a state probe:
    - Chips and card render in DOM order, with nothing after the card (AC7).
    - Clicking a chip switches the card and `teamId` (AC13).
    - A pending (deferred) or rejected `getEntities` renders no group and no section, and does not
      throw (AC14).
    - With defs pending, the card shows without a `dl`.
    - Changing the season via the probe's dispatch keeps the same active chip and updates the meta
      suffix, record and values. With the old season resolving late, the new season's data shows,
      and in the gap no stale card is shown (AC18, AC23).
    - An unknown `teamId` shows no pressed chip and no card, `teamId` stays unchanged, and clicking a
      chip shows its card (AC19).
    - AC9: a harness opens the add-stat menu via `toggleAddStatMenu`. (a) With kind teams, it
      switches `teamMode` to `inside`. (b) With kind players and `teamMode` `inside`, it switches
      kind to teams. In both cases, once the breakdown is shown, `addStatOpen` is `null`.
  - Files: `components/teams/TeamBreakdown.tsx`, `TeamBreakdown.module.css`,
    `TeamBreakdown.test.tsx`, `components/teams/index.ts`.
  - ACs: AC7, AC9, AC13, AC14, AC18, AC19, AC21, AC23.
- T6: App wiring. Add `AppMain` in `App.tsx` with the switch, then either the breakdown or the
  existing compare block (section 3).
  - New `App.teams.test.tsx`, using the real mock data like the other App tests:
    - The switch is absent on Players and present on Teams (AC1, AC2).
    - Breakdown removes the "Selected teams" list, the "Stats" complementary and the "Stat views"
      region, and shows the "Teams" chip group and the default team card with the four summary
      labels and formatted values (AC6, AC7, AC15-AC17).
    - Players while in breakdown shows the players compare UI and no switch, and back to Teams shows
      breakdown (AC5).
    - Round trip (AC8): before breakdown, set a deselected team, a toggled stat, the Table or 2D
      Radar view and a changed 3D X axis. After returning, the same cards, checkboxes, pressed tab or
      sub-mode and axis select value are shown. Camera round trip: press ArrowRight on the "3D chart"
      group, note the overlay label position, do the round trip, and check the position is the same.
    - The add-entity popover open, then breakdown, then compare leaves it closed (AC10).
    - AC9 path (a) in the DOM: open the "Offense" add-stat menu in Teams compare, do the round trip,
      and check that no menu is open.
    - A season change in breakdown updates the meta suffix and record (AC18).
  - Run the existing `App.*.test.tsx`. They are expected to pass unchanged. Fix any break by scoping
    only.
  - Files: `App.tsx`, `App.teams.test.tsx` (existing App tests only if they break).
  - ACs: AC1, AC2, AC5, AC6, AC7, AC8, AC9, AC10, AC18, AC21.
- T7: League-literal coverage. Add `components/teams/noLeagueLiterals.test.ts` with the same
  `leagueValues` list as the compare scan, plus team ids, names, abbreviations and divisions from
  `RAW_T` and every `summaryLabel`.
  - Sources: every new `.ts`/`.tsx` in `components/teams/`.
  - Add a planted-literal check (for example `'ppg'`, `"Pts / G"`, a team abbreviation) and a
    check that none of the files import `data/` or `MockProvider`.
  - Files: `components/teams/noLeagueLiterals.test.ts`.
  - ACs: AC11, AC20.
- T8: Quality gate and manual checks.
  - Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run format` and `npm run build` in
    `web/`, and fix findings without weakening tests.
  - In the dev server at 375px and 1280px, check Teams compare and breakdown: no horizontal scroll,
    the hint wraps, chips wrap, and the card stats wrap under the name at 375px and sit right at
    1280px. Check keyboard Tab through the switch and chips.
  - Note the results for the PR.
  - Files: none expected.
  - ACs: AC22, plus a manual check of the section 4 layout.

## 8. Open questions

None blocking. The defaults below are applied and can be changed at review.
1. Provider contract (A3): summary stats are marked with an optional `StatDef.summaryLabel` rather
   than a new `LeagueUiDefaults` field or provider method. Is this acceptable for the T22 API?
2. Unknown team (A7): show no card and no active chip, or auto-select the first team?
3. Chip shape: the shared `Chip` is pill-shaped with `6px 14px` padding, while the design's team
   chips use radius 8 and `7px 12px`. The plan reuses `Chip` as is and leaves exact fidelity to T20.
   Should T15 add a variant instead?
4. Add-stat menu close: done by a mount effect in `TeamBreakdown` using the existing
   `closeAddStatMenu`, rather than changing the `setKind`/`setTeamMode` reducer cases. Is the
   reducer change preferred?
