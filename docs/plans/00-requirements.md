# T07 requirements: Global nav

Source ticket: `docs/tickets/T07-global-nav.md` (its acceptance criteria are the contract).
References: handoff `design_handoff_statpakd/README.md` section 1 "Global nav", "Interactions &
Behavior" and "Design Tokens"; design markup `design_handoff_statpakd/design/StatPakd App.dc.html`
lines 16-29 (header markup) and script lines 214-215 (`SEASONS`, `LEAGUES`) and 452-455 (`leagues`,
`kindTabs`, `onSeason`). Merged building blocks: `web/src/components/ui/` (`SegmentedControl` with
`variant="dark"`, `Select` with `variant="dark"`), `web/src/styles/tokens.css` (`--color-nav-*`
tokens), `web/src/domain/provider.ts` (`DataProvider.getLeagues`, `getSeasons`),
`web/src/data/mockProvider.ts` (`MockProvider`), `web/src/state/` (`AppStateProvider`,
`useAppState`, actions `setKind` and `setSeason`).

## Goal

Show a black top bar on the app's main page with the StatPakd logo, the league tabs from the data
provider (enabled leagues active, others disabled with a "SOON" tag), a Players/Teams segmented
control and a Season select filled from `getSeasons`. Changing kind or season dispatches the T06
`setKind` / `setSeason` actions, and the nav matches the handoff at desktop and narrow widths.

## Design values to match (from handoff section 1 and the design markup)

- Bar: `<header>`, background `#111`, padding `12px 28px`, flex row, `align-items: center`, gap 24px,
  `flex-wrap: wrap`.
- Logo: "Stat" in white + "Pakd" in a pill (bg `#fff`, text `#111`, radius 5px, padding `0 6px 2px`),
  2px gap between the two parts; Geist 700, 20px, letter-spacing -0.03em.
- League list: gap 18px between items; each item 13px / 600; enabled item text `#fff`; disabled item
  text `#6A6A66` followed (5px gap) by a "SOON" tag in Geist Mono 10px, colour `#6A6A66`.
- Right group: pushed to the right edge (`margin-left: auto`), gap 12px between its children.
- Kind control: track `#2A2A28`, radius 8px, padding 3px; items 13px / 600, padding `6px 14px`,
  radius 6px; active item bg `#fff`, text `#111`; inactive item transparent, text `#A5A5A0`.
- Season: visible label text "Season" (12px, `#A5A5A0`, 8px gap to the select); select bg `#2A2A28`,
  border `1px solid #3A3A37`, radius 7px, padding `6px 10px`, white 13px / 600 text. Option text is
  `"<season> Regular Season"`, in the order returned by `getSeasons` (newest first).

## Acceptance criteria

Mounting and data
- AC1: Visiting `/` renders the nav as the first element of the page, above any other content.
  Visiting `/dev` still renders the existing DevPage (nav not required there).
- AC2: The nav reads leagues and seasons only through the `DataProvider` interface obtained from a
  React context (not by importing `MockProvider` or any `data/` module). The app root supplies a
  `MockProvider` instance through that context and wraps the page in `AppStateProvider` with the
  league's UI defaults and stat defs.
- AC3: Using the provider-context hook outside its provider throws a clear error (tested).
- AC4: The nav component source contains no league-specific literals (league ids or names such as
  "nfl"/"NFL"/"NBA", season literals such as "2024", or other NFL data values). A test enforces this
  in the same style as `web/src/state/noLeagueLiterals.test.ts`, and the component tests use a
  made-up fixture provider (invented league ids/names/seasons) to show it is league agnostic.

Logo and league tabs
- AC5: The logo shows "Stat" and "Pakd" with the styles listed above; its accessible text is
  "StatPakd".
- AC6: One item is rendered per league returned by `getLeagues`, in that order, labelled with the
  league `name`. League items sit inside a `<nav>` landmark with an accessible name (for example
  "Leagues").
- AC7: An enabled league renders white, has no "SOON" tag, and is marked as the current/active league
  (`aria-current="page"` or equivalent). The active league is the first enabled league.
- AC8: A disabled league renders in `#6A6A66` with a visible "SOON" tag, is announced as disabled to
  assistive tech (native `disabled` or `aria-disabled="true"`), cannot be reached as an active item:
  Tab never lands on it as the active league, clicking or pressing Enter/Space on it changes nothing,
  and it never gets `aria-current`.
- AC9: While `getLeagues` is pending, the bar still renders (logo and kind control visible) and the
  page does not crash; if it rejects, the league list is empty and the rest of the nav still works.

Players/Teams control
- AC10: The kind control shows "Players" and "Teams"; the one matching `state.kind` is visually active
  and exposed as pressed/selected (`aria-pressed="true"` from the existing primitive); the group has
  an accessible label.
- AC11: Clicking "Teams" dispatches `setKind('teams')`, so `state.kind` becomes `'teams'` and `q`
  becomes `''`, `pos` becomes `'All'`, `addOpen` becomes `false`; clicking "Players" does the reverse.
  A component test seeds non-default `q`, `pos` and `addOpen` and asserts they reset (ticket AC).

Season select
- AC12: Seasons come from `getSeasons(<active league id>)`; the test asserts the call uses the active
  league id from the fixture. Options appear in the returned order with text
  `"<season> Regular Season"` and value `<season>`.
- AC13: The select's value reflects `state.season`. Choosing another option dispatches
  `setSeason(<value>)` and `state.season` updates; `kind`, `sel`, `stats` stay unchanged (tested).
- AC14: The select has an accessible name "Season" (visible label associated with it, or
  `aria-label`), and while seasons are loading or if `getSeasons` rejects, the nav does not crash.

Layout in the browser
- AC15 (1280px viewport): the whole nav is one row: logo at the left, league items 24px to its right,
  kind control and Season select flush right with 28px right padding; all colours, font sizes,
  weights, radii and paddings match the "Design values" list when inspected in DevTools (computed
  styles). Fonts render as Geist / Geist Mono.
- AC16 (375px viewport): the nav wraps onto multiple rows instead of overflowing: no horizontal page
  scroll (`document.documentElement.scrollWidth <= 375`), every element (logo, all four league
  items with SOON tags, both kind buttons, Season label and select) is fully visible and not clipped,
  and items keep the 28px side padding. The right group may wrap internally (for example the Season
  label/select dropping below the kind control).
- AC17: Every interactive nav control (enabled league item if it is a control, kind buttons, season
  select) shows a visible focus indicator on the black background when reached by keyboard, and
  Tab order is logo-side to right: league items, kind buttons, season select.

Quality gates
- AC18: Component tests cover kind changes, season changes, disabled league behaviour and loading
  from a fixture provider (ticket AC "Component test for kind and season changes").
- AC19: The existing `web/src/App.test.tsx` passes unchanged (it expects a heading named
  "StatPakd"), as do all other existing tests.
- AC20: `npm test`, `npm run lint`, `npm run typecheck`, `npm run format` and `npm run build` pass.

## Out of scope

- League switching: there is no league field or action in app state; clicking the enabled league
  does nothing beyond being the current one. Supporting several enabled leagues is a later change.
- Teams mode switch, picker cards, sidebar, compare panel, team breakdown, or any content below the
  nav (T08-T17). The content container from handoff section 2 is not required beyond what is needed
  to keep the existing placeholder heading.
- Loading `LeagueUiDefaults` or stat defs asynchronously from the provider; the app root may pass the
  mock defaults synchronously as T06 does.
- Recomputing data on season change (later tickets consume `state.season`).
- Validating that `state.season` is in the returned season list, or pruning selections.
- Routing beyond the existing `/` and `/dev` branch; persistence of kind/season (URL, storage).
- The full responsive/a11y audit at 768px, touch-target sizing and contrast fixes (T18), and the
  pixel-diff visual pass (T20).
- Loading spinners, skeletons or error banners for the nav.

## Assumptions

- A1: Provider supply: a new React context for the `DataProvider` (context + `useDataProvider()`-style
  hook) lives outside `components/` (for example `web/src/data/` or a provider module next to the
  domain types). The composition root (`App.tsx`) is the only place that names `MockProvider` and the
  NFL defaults; components never do. This mirrors the T06 decision that defaults are injected.
- A2: Mounting: `App.tsx` keeps the `/dev` branch; for every other path it renders the provider
  context, `AppStateProvider`, then the nav followed by the existing placeholder content. Later
  tickets replace the placeholder, not the nav.
- A3: The existing `App.test.tsx` heading check must keep passing without edits (project rule: never
  weaken a test). Either the placeholder `<h1>StatPakd</h1>` stays below the nav, or the logo is
  marked up as the `h1` with accessible name "StatPakd"; either satisfies AC19. Default: keep the
  placeholder heading and make the logo non-heading text, to avoid two headings named the same,
  the planner may choose the logo-as-h1 option instead and remove the placeholder.
- A4: Because the app state has no league field, the active league is the first league with
  `enabled: true` from `getLeagues`, and seasons are fetched for that league. If no league is enabled,
  no league is active and the season select shows no options.
- A5: Disabled league items are rendered as native `<button disabled>` (or equivalent with
  `aria-disabled`) so they are skipped by Tab and announced as disabled; the enabled league item is
  marked `aria-current`. A single enabled league needs no roving-tabindex tablist; the existing
  `Tabs` primitive (which links to tab panels) is not used for leagues.
- A6: The "SOON" tag text is a generic UI string, not league data. "Players", "Teams", "Season" and
  the "Regular Season" suffix are generic UI strings from the design and may appear in the component.
- A7: The existing dark `SegmentedControl` (2px gap between items) and dark `Select` primitives are
  reused. The design select padding is `6px 10px` while the primitive uses `7px 10px`; the nav must
  show `6px 10px` (by adjusting the dark variant or a nav override, planner's choice). The 2px item
  gap in the segmented control is accepted as within tolerance.
- A8: At 375px the design's markup would overflow (its right group does not wrap); allowing the
  right group to wrap is a sanctioned deviation to meet the handoff "wraps" note and AC16.
- A9: The design does not specify a focus style; use the existing `--color-focus` token or a white
  outline, whichever is visible on `#111`. Final contrast decisions stay with T18.
- A10: Async results are fetched once on mount (seasons again only if the active league changed);
  in-flight results after unmount are ignored without React warnings.
- A11: Clicking the already active kind still dispatches `setKind` (the reducer resets `q`, `pos`,
  `addOpen` even then, per T06 AC14); no special-casing in the nav.

## Open questions

No blocking questions. Non-blocking, for the human later:
1. Should the logo be the page `h1` (replacing the placeholder heading), or plain text? Assumed
   plain text with the placeholder heading kept (A3).
2. When more than one league is enabled, should league selection live in app state (new action) and
   reset selections/defaults per league? Assumed out of scope (A4).
3. Is the "Regular Season" suffix right for every league, or should the season label come from the
   provider (for example a display label per season)? Assumed a fixed UI suffix (A6).
4. At 375px, is the wrapped layout (Season select on its own row) acceptable to design, or should the
   "Season" text label be hidden on narrow screens to save space? Assumed wrap, label kept (A8).
