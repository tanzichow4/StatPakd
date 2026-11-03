# T07 plan: Global nav

Source: `docs/tickets/T07-global-nav.md`, requirements `docs/plans/00-requirements.md` (ACs and
assumptions A1-A11 are the contract; this run is non-interactive, so the defaults are used).

## 1. Goal and out of scope

Goal: show a black top bar on `/` with the StatPakd logo, league items from the data provider
(enabled ones active, disabled ones marked "SOON"), a Players/Teams control and a Season select filled
from `getSeasons`. Changing kind or season dispatches the T06 `setKind` / `setSeason` actions, and the
bar matches the handoff at 1280px and wraps cleanly at 375px.

Out of scope (from requirements): league switching or a league field in state; anything below the nav
(T08-T17); async loading of UI defaults or stat defs; recomputing data on season change; checking that
`state.season` is in the season list; routing beyond `/` and `/dev`; persisting kind/season; the full
768px / touch-target / contrast audit (T18); pixel-diff pass (T20); spinners, skeletons, error banners.

## 2. Acceptance criteria (copied from 00-requirements.md, same numbers)

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
- AC5: The logo shows "Stat" and "Pakd" with the styles listed in the requirements; its accessible
  text is "StatPakd".
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

Added
- AC21 (added): Async results that arrive after the nav unmounts, or for a league that is no longer
  active, are ignored: no state update, no React warning (A10 made testable; this protects the
  existing `App.test.tsx`, which unmounts before `MockProvider` resolves).
- AC22 (added): The DevPage dark `Select` also shows `6px 10px` padding after the variant change
  (the change is to the shared dark variant, so `/dev` is checked too); light variant stays `7px 10px`.

## 3. Architecture

Approach: a new context module supplies the `DataProvider`; a nav component under `components/`
reads it through a hook, fetches leagues once and seasons for the first enabled league, and reads and
writes kind/season through the existing `useAppState`. `App.tsx` is the only composition root that
names `MockProvider` and the NFL defaults.

### New: DataProvider context (outside `components/` and outside `data/`, so the nav never imports `data/`)

Directory `web/src/dataSource/`:
- `dataProviderContext.ts`: `export const DataProviderContext = createContext<DataProvider | null>(null)`.
  Separate file so the component file only exports components (same split as `state/`).
- `DataSource.tsx`: `export function DataSource({ provider, children }: DataSourceProps)` and
  `export interface DataSourceProps { provider: DataProvider; children: ReactNode }`. Renders
  `DataProviderContext.Provider value={provider}`. Doc comment: the provider instance should be
  stable (create once, module scope or `useState`).
- `useDataProvider.ts`: `export function useDataProvider(): DataProvider`; throws
  `new Error('useDataProvider must be used inside <DataSource>')` when the context is null.
- `index.ts`: re-exports `DataProviderContext`, `DataSource`, `DataSourceProps`, `useDataProvider`.
- `DataSource.test.tsx`: hook returns the given instance; outside the provider it throws the message
  (spy `console.error`, as in `state/AppStateProvider.test.tsx`).

### New: nav component

Directory `web/src/components/nav/`:
- `useNavData.ts`: `export function useNavData(): { leagues: League[]; activeLeagueId: LeagueId | null; seasons: Season[] }`.
  - Effect 1 (deps `[provider]`): `provider.getLeagues()`; on resolve set leagues; on reject set `[]`.
    A `cancelled` flag set in cleanup prevents updates after unmount (AC21). Errors are swallowed
    silently (no banners in scope; no console noise in tests).
  - `activeLeagueId = leagues.find(l => l.enabled)?.id ?? null` (A4).
  - Effect 2 (deps `[provider, activeLeagueId]`): if null, seasons `[]`; else
    `provider.getSeasons(activeLeagueId)`, reject leads to `[]`, same cancel guard. Reset seasons to
    `[]` when the league changes so stale options never show.
  - Imports only from `../../dataSource`, `../../domain/types` and React.
- `GlobalNav.tsx`: `export function GlobalNav()`; markup:
  ```
  <header class=bar>
    <div class=logo> <span aria-hidden>Stat</span><span aria-hidden class=pill>Pakd</span>
                     <span class=srOnly>StatPakd</span> </div>
    <nav aria-label="Leagues"><ul class=leagues>
      <li> enabled+active: <button type=button class=league aria-current="page">{name}</button>
           disabled:       <button type=button class="league disabled" disabled>{name}<span class=soon>SOON</span></button>
    </ul></nav>
    <div class=right>
      <SegmentedControl variant="dark" label="Players or teams" options=[players, teams]
                        value={state.kind} onChange={k => dispatch({type:'setKind', kind:k})} />
      <label class=seasonLabel>Season
        <Select variant="dark" label="Season" value={state.season}
                options={seasons.map(s => ({value:s, label:`${s} Regular Season`}))}
                onChange={s => dispatch({type:'setSeason', season:s})} /></label>
    </div>
  </header>
  ```
  - Logo is not a heading (A3 default); the placeholder `<h1>StatPakd</h1>` stays below the nav.
  - Enabled league is a button with no `onClick` effect (league switching out of scope), so it is in
    the Tab order and focusable; any enabled league other than the first gets no `aria-current`.
  - Disabled leagues use native `disabled`: skipped by Tab, ignore clicks/keys, announced disabled.
  - Option/label strings "Players", "Teams", "Season", "SOON", "Regular Season" are generic (A6).
- `GlobalNav.module.css`: `.bar` (bg `var(--color-ink)`, color white, padding `12px 28px`, flex,
  align center, gap 24px, wrap), `.logo` (inline-flex, gap 2px, 700, 20px, letter-spacing -0.03em,
  line-height normal), `.pill` (bg white, color ink, padding `0 6px 2px`, radius 5px), `.leagues`
  (list reset, flex, gap 18px, flex-wrap wrap, 13px/600), `.league` (button reset: border 0,
  background transparent, padding 0, font inherit, color white, inline-flex, gap 5px, align center),
  `.league:disabled` (color `var(--color-nav-soon)`, cursor default), `.soon` (Geist Mono 10px,
  color `var(--color-nav-soon)`), `.right` (margin-left auto, flex, align center, gap 12px,
  flex-wrap wrap, min-width 0), `.seasonLabel` (inline-flex, gap 8px, 12px, color
  `var(--color-nav-text)`), `.srOnly` (standard visually-hidden), and
  `.bar :focus-visible { outline-color: var(--color-white); }` (A9: blue focus ring is weak on #111).
  Use tokens for every colour/size that exists in `tokens.css`.
- `index.ts`: `export { GlobalNav } from './GlobalNav'`.
- `GlobalNav.test.tsx`: component tests (section 7, T5).
- `noLeagueLiterals.test.ts`: scans `GlobalNav.tsx?raw`, `useNavData.ts?raw` (and
  `GlobalNav.module.css?raw` is not needed). Literal list = the T06 list (UI defaults, seasons,
  roster units, stat keys/groups, positions) plus every `id` and `name` from `getLeagueRegistry()`
  (test files may import `data/`). Also asserts neither source contains `'data/` or `MockProvider`
  (AC2), plus the "loaded" and "planted literal" checks.

### Changed files
- `web/src/components/ui/Select.module.css`: in `.dark` add `padding: 6px 10px` (A7; AC22). Light
  stays `7px 10px`. No change to `Select.tsx` or `SegmentedControl` (2px gap accepted, A7).
- `web/src/App.tsx`: keep the `/dev` branch; otherwise render
  `<DataSource provider={provider}><AppStateProvider defaults={nflUiDefaults()} statDefs={nflStatDefsByKind()}><GlobalNav /><main><h1>StatPakd</h1></main></AppStateProvider></DataSource>`
  with `const provider = new MockProvider()` at module scope. Defaults computed once via `useState`
  initialiser or module scope (AppStateProvider reads them once anyway).
- New `web/src/App.nav.test.tsx` (do not edit `App.test.tsx`, AC19): the first child of the
  container is a `banner` landmark; the "Leagues" nav lists the mock leagues once they resolve; with
  `window.history.pushState({}, '', '/dev')` the DevPage heading "UI primitives" renders and no
  banner (restore path to `/` after).
- New shared test helper `web/src/test/fixtureProvider.ts`: `fixtureLeagues` (invented, for example
  `{id:'zorb', name:'Zorbball', enabled:true}`, `{id:'quix', name:'Quixball', enabled:false}`,
  `{id:'flarn', name:'Flarnball', enabled:false}`), `fixtureSeasons` (`['3031','3030','3029']`),
  `createFixtureProvider(overrides?: Partial<DataProvider>): DataProvider` whose methods are
  `vi.fn` spies (getStatDefs/getEntities/getRoster resolve `[]`), `fixtureUiDefaults()` (season
  `'3031'`, invented ids) and `fixtureStatDefs()` (two invented stats per kind), and a
  `deferred<T>()` helper for pending/rejecting promises.

Data and API changes: none to `DataProvider`, domain types or the reducer.
Dependencies: none new (React, Testing Library, user-event and Vitest `?raw` imports already used).

## 4. Design

User flow: the page loads; the bar shows at once with logo, kind control (Players active) and an
empty Season select; league items appear when `getLeagues` resolves; season options appear when
`getSeasons` resolves. Clicking Teams/Players switches kind and resets search, position filter and
the add popover. Choosing a season updates `state.season`.

States:
- Loading: leagues list empty (the `<nav>` still renders, empty `<ul>`); select has no options; logo
  and kind control fully usable. No spinner (out of scope).
- Empty: `getLeagues` resolves `[]` or no enabled league: no league items or no active league, no
  season options; nothing crashes.
- Error: `getLeagues` or `getSeasons` rejects: treated as empty; the rest works.
- Success: all league items, Season options newest first, value = `state.season`.

Widths:
- 1280px: one row; logo, 24px gap, leagues; right group pushed right by `margin-left: auto`.
- 375px: header wraps (logo + leagues on row 1 if they fit, else leagues on row 2); right group
  wraps to its own row and may wrap internally (Season label + select below the kind control).
  Long option text "3031 Regular Season" must fit: the select width is intrinsic (about 170px), well
  under 375 - 56 = 319px. Leagues `ul` also wraps so many leagues never overflow.

Accessibility: `header` (banner landmark), `nav aria-label="Leagues"` with a list, `aria-current` on
the active league, native `disabled` on unavailable leagues, kind group labelled via the
SegmentedControl `fieldset aria-label`, buttons with `aria-pressed`, select with accessible name
"Season" plus visible label wrapping it, logo read as "StatPakd" (visual spans `aria-hidden`), white
focus ring on the dark bar, DOM order equals visual order so Tab goes leagues, kind, season.

## 5. Risk and security

- Input validation: the only inputs are the select value (always one of the rendered options) and
  kind values from a fixed list; the reducer already guards. League names and seasons are rendered
  as React text (auto-escaped); no `dangerouslySetInnerHTML`. Safeguard: T4 uses text rendering only.
- Auth / data exposure: none; static mock data, no network calls, no env vars.
- Failure modes and safeguards (concrete tasks):
  - Provider rejects: caught in `useNavData`, falls back to `[]` (T3, tested in T5).
  - Late resolve after unmount or league change: cancel flag in effect cleanup (T3; AC21 test in T5).
  - StrictMode double effects in dev cause two `getLeagues` calls: harmless; tests assert
    "called with id", not "called once".
  - Missing provider: `useDataProvider` throws a clear error (T1).
  - League literals sneaking into the nav: literal-scan test (T6).
  - Shared `Select` dark padding change affects DevPage: checked in QA (AC22).
  - `state.season` not in the option list (for example before seasons load): the browser shows no
    or the first option; accepted (validation out of scope).

## 6. Gaps check

- Auth: not applicable (no accounts, static data).
- Validation: covered in section 5; no new user input beyond fixed choices.
- Error handling: provider rejections and unmount races handled (AC9, AC14, AC21).
- Mobile: 375px wrap rules in CSS, QA check list below (AC16).
- Accessibility: landmarks, names, disabled/current/pressed states, focus ring, Tab order (AC5-AC8,
  AC10, AC14, AC17).
- Config and env vars: none needed; `.env` untouched.
- Tests: context hook, nav component, literal scan, App mount test; existing tests untouched (AC19).

## 7. Tasks (one commit each)

- T1 (AC2, AC3): add `web/src/dataSource/` (`dataProviderContext.ts`, `DataSource.tsx`,
  `useDataProvider.ts`, `index.ts`) and `DataSource.test.tsx`.
- T2 (AC4, AC18): add `web/src/test/fixtureProvider.ts` (invented leagues/seasons/defaults/stat
  defs, `vi.fn` spies, `deferred` helper).
- T3 (AC6, AC7, AC9, AC12, AC14, AC21): add `web/src/components/nav/useNavData.ts`.
- T4 (AC5-AC8, AC10, AC11, AC13-AC17, AC22): add `GlobalNav.tsx`, `GlobalNav.module.css`,
  `components/nav/index.ts`; change `.dark` padding in `components/ui/Select.module.css`.
- T5 (AC3-AC14, AC18, AC21): `components/nav/GlobalNav.test.tsx`. Render helper wraps
  `<DataSource provider={fixture}><AppStateProvider defaults={fixtureUiDefaults()} statDefs={fixtureStatDefs()}>`
  plus a `StateProbe` component that prints `JSON.stringify` of `kind, season, q, pos, addOpen, sel,
  stats` and has seed buttons. Cases:
  - logo accessible text "StatPakd" visible via `getByText`, not a heading (AC5);
  - after leagues resolve: buttons in the "Leagues" nav in fixture order with fixture names (AC6);
  - first enabled league has `aria-current="page"`, no "SOON"; disabled ones are `toBeDisabled()`,
    contain "SOON", have no `aria-current`; clicking and pressing Enter/Space on a disabled one leaves
    state unchanged; Tab sequence from the start goes enabled league, Players, Teams, Season select
    and never lands on a disabled league (AC7, AC8, AC17 order);
  - pending `getLeagues` (deferred): logo and kind buttons render; reject: zero league buttons, kind
    toggle still works (AC9);
  - kind: Players pressed initially; seed in this order: `toggleAdd` (it clears `q`), then
    `setQuery('abc')`, `setPos('X')`; click Teams: kind `teams`, `q ''`, `pos 'All'`, `addOpen false`,
    Teams `aria-pressed="true"`; click Players reverses (AC10, AC11);
  - seasons: `getSeasons` called with the fixture enabled id; options text and value in order;
    select value equals fixture default; `selectOptions` second season: `season` updates, `kind`,
    `sel`, `stats` unchanged (AC12, AC13); select found by `getByRole('combobox', {name:'Season'})`;
    `getSeasons` reject or no enabled league: zero options, no crash (AC14);
  - unmount while `getLeagues`/`getSeasons` deferred, then resolve: no `console.error` call (spy)
    (AC21).
- T6 (AC2, AC4): `components/nav/noLeagueLiterals.test.ts` as described in section 3.
- T7 (AC1, AC2, AC19): update `App.tsx` mounting; add `web/src/App.nav.test.tsx`.
- T8 (AC15-AC17, AC20, AC22): run `npm test`, `npm run lint`, `npm run typecheck`,
  `npm run format`, `npm run build`; fix issues; QA browser checks below.

Parallel work: the test-writer can do T2, T5, T6 and the `App.nav.test.tsx` part of T7 in parallel
with the coder's T1, T3, T4, T7, using the contracts fixed above (paths, export names, hook error
message, `aria-label="Leagues"`, kind group label "Players or teams", select name "Season", "SOON"
text, `aria-current="page"`, native `disabled`, option text `"<season> Regular Season"`). T1 must
land before T5 runs green; T2 is needed by T5 and should come first from the test-writer.

## QA browser checks (`npm run dev`, open `/`)

At 1280px (DevTools responsive mode, 1280 x 800):
1. Header is the first element; black (`rgb(17,17,17)`), padding `12px 28px`, single row (AC1, AC15).
2. Logo: "Stat" white, "Pakd" in white pill with dark text, radius 5px, padding `0 6px 2px`,
   gap 2px, Geist 700 20px, letter-spacing -0.6px computed (AC5, AC15).
3. Leagues start 24px right of the logo; 18px between items; NFL white 13px/600, no SOON; NBA, MLB,
   NHL `rgb(106,106,102)` with "SOON" in Geist Mono 10px 5px after the name (AC6-AC8, AC15).
4. Right group flush right, right padding 28px, 12px gap; kind track `rgb(42,42,40)`, radius 8px,
   padding 3px; items 6px 14px, radius 6px; active white with dark text, inactive `rgb(165,165,160)`
   (AC10, AC15).
5. "Season" label 12px `rgb(165,165,160)`, 8px to the select; select bg `rgb(42,42,40)`, border
   `1px solid rgb(58,58,55)`, radius 7px, padding `6px 10px`, white 13px/600; options
   "2024 Regular Season", ... newest first, value 2024 (AC12, AC15).
6. Computed `font-family` shows Geist / Geist Mono and the Network tab shows the fonts loaded (AC15).
7. Click Teams: Teams becomes active; React DevTools or later UI shows kind teams. Change season:
   select shows the new season (AC11, AC13).
8. Keyboard: from the address bar press Tab: NFL, Players, Teams, Season select in order, never NBA,
   MLB or NHL; each shows a clearly visible (white) focus ring. Clicking NBA does nothing (AC8, AC17).
9. Accessibility tree (DevTools): banner, navigation "Leagues", NFL `aria-current=page`, NBA/MLB/NHL
   disabled, group "Players or teams", combobox "Season", logo text "StatPakd" (AC5-AC8, AC10, AC14).

At 375px (375 x 812):
10. Run `document.documentElement.scrollWidth <= 375` in the console: true (AC16).
11. Nav wraps onto multiple rows; logo, all four league items with SOON tags, both kind buttons, the
    Season label and the select are fully visible, nothing clipped or overlapping; left and right
    padding remain 28px (AC16).
12. Repeat steps 7 and 8 at this width (AC11, AC13, AC17).

Also:
13. Open `/dev`: DevPage renders without the nav; the dark Select shows padding `6px 10px`, light
    Select `7px 10px` (AC1, AC22).
14. No console errors or React warnings on load and while switching kind/season (AC9, AC21).

## 8. Open questions (none blocking; defaults applied)

1. Should the logo become the page `h1` and the placeholder heading go away? Plan keeps the logo as
   plain text and the placeholder `<h1>` (A3).
2. When several leagues are enabled, should league selection move into app state with per-league
   resets? Out of scope; first enabled league is active (A4).
3. Is "Regular Season" right for every league, or should the provider supply season display labels?
   Fixed UI suffix for now (A6).
4. At 375px is the wrapped layout acceptable, or should the "Season" text label hide on narrow
   screens? Plan wraps and keeps the label (A8).
5. Should provider failures be logged (console) for debugging? Plan swallows them silently.
