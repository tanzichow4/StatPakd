# Plan: T06 App state reducer and context

Source: `docs/tickets/T06-app-state.md`, requirements `docs/plans/00-requirements.md` (contract).
This run is non-interactive, so assumptions A1-A9 from the requirements are adopted as decisions.

## 1. Goal and out of scope

Goal: provide one league-agnostic source of UI state for the web app: a pure reducer that enforces
every selection, stat, kind, season, view, camera and team-breakdown rule from the handoff, plus a
React context provider and `useAppState()` hook. NFL-specific defaults (ids, stat keys, axes, team,
unit, sort key, season) come from the data layer and are not written into the state module.

Out of scope (from requirements): any rendering or UI wiring (App.tsx is not touched); loading
defaults async from `DataProvider`/API; checking ids/teams/seasons against data or pruning
selections on season change; the design's `shown` field and league selection; drag math beyond the
pitch clamp (T13/T14); persistence, undo, recomputation on season change; search/position filter
logic (T08).

## 2. Acceptance criteria

Copied from `docs/plans/00-requirements.md`, same numbers.

Initial state and defaults
- AC1: The initial state is built from injected defaults. With the mock NFL defaults it equals the
  design: `kind 'players'`, `season '2024'`, `sel.players ['allen','barkley','chase']`,
  `sel.teams ['kc','det','bal']`,
  `stats.players ['passYds','passTd','rushYds','recYds','scrim','totTd']`,
  `stats.teams ['ppg','ypg','third','papg','to','win']`, `ax.players ['rushYds','recYds','totTd']`,
  `ax.teams ['ppg','papg','to']`, `view '3d'`, `chart2 'bars'`, `q ''`, `pos 'All'`,
  `addOpen false`, `addStatOpen null`, `teamMode 'compare'`, `teamId 'phi'`, `unit 'off'`,
  `tSort {k:'snap', d:-1}`, `yaw -0.65`, `pitch 0.38`.
- AC2: The reducer/state source files contain no NFL entity ids, team ids, stat keys, roster unit keys,
  position codes other than the generic "All" sentinel, or season literals. A test builds an initial
  state from a non-NFL fixture (made-up ids/keys/groups) and every rule below works with it.
- AC3: Generic UI defaults that are not league data (`view '3d'`, `chart2 'bars'`, `yaw -0.65`,
  `pitch 0.38`, `q ''`, `pos 'All'`, `addOpen false`, `addStatOpen null`, `teamMode 'compare'`,
  `kind 'players'`, `tSort.d -1`, max selection 8) may live in the state module.

Entity selection (acts on the current `kind` only)
- AC4: Toggling an id not in `sel[kind]` appends it to the end (order preserved = colour index);
  toggling an id already present removes it and keeps the order of the rest.
- AC5: When `sel[kind]` already has 8 ids, toggling a new id leaves the selection unchanged.
- AC6: After any toggle, if `sel[kind]` has 8 ids, `addOpen` becomes false; adding the 8th id closes
  an open popover. Otherwise `addOpen` is unchanged.
- AC7: Selection changes for one kind never change the other kind's selection (players and teams keep
  separate lists; switching kind and back shows the earlier list unchanged).

Stats (acts on the current `kind` only)
- AC8: Toggling a selected stat removes it, unless it is the only selected stat, in which case
  `stats[kind]` is unchanged (minimum 1).
- AC9: Adding a stat (via toggle of an unselected key, or the "add stat from menu" action) results in
  `stats[kind]` sorted in canonical order regardless of the order of additions; e.g. adding `int` to
  `['passYds','rushYds']` gives `['passYds','int','rushYds']`, and adding an extra (`passYpg`) places
  it inside its group.
- AC10: The "add stat from menu" action also sets `addStatOpen` to null.
- AC11: A stat key not in the kind's canonical order is ignored (state unchanged), and duplicates are
  never produced.
- AC12: Opening the add-stat menu for group G sets `addStatOpen` to G; dispatching it again for G
  sets it to null; dispatching it for another group H switches to H.
- AC13: Stats for one kind never change the other kind's stats.

Kind and season
- AC14: Switching kind sets `kind` and resets `q` to '', `pos` to 'All' and `addOpen` to false (also
  when switching to the kind already active). `sel`, `stats`, `ax`, `season`, `view` are unchanged.
- AC15: Changing season sets `season` and leaves `sel` (both kinds), `stats`, `ax`, `kind`, `view`
  and all other fields unchanged.

Search, filter, popover
- AC16: Setting the search text sets `q`; setting the position filter sets `pos`.
- AC17: Toggling the add popover flips `addOpen` and resets `q` to '' (design `toggleAdd`). A
  separate close action ("Done") sets `addOpen` false.

Views and axes
- AC18: Setting `view` to 'num' | '2d' | '3d' and `chart2` to 'bars' | 'radar' stores the value and
  changes nothing else.
- AC19: Setting axis i (0 = X, 1 = Y, 2 = Z) of the current kind to a stat key replaces only that
  slot of `ax[kind]`; the other slots and the other kind's axes are unchanged. Any stat key of the
  kind is accepted, selected or not.

3D camera
- AC20: Setting the camera stores `yaw` as given and `pitch` clamped to [-0.2, 1.3] (e.g. 2 -> 1.3,
  -1 -> -0.2, 0.5 -> 0.5).
- AC21: Reset view sets `yaw` and `pitch` back to -0.65 and 0.38.

Team breakdown
- AC22: Switching `teamMode` sets it and sets `addOpen` to false.
- AC23: Selecting a team sets `teamId` and changes nothing else.
- AC24: Switching `unit` sets it and resets `tSort` to `{k: <injected default sort key>, d: -1}`.
- AC25: Sorting by key K: if `tSort.k === K` the direction flips (-1 <-> 1); otherwise `tSort`
  becomes `{k: K, d: -1}` (descending first).

Purity and context
- AC26: The reducer is pure: given deep-frozen input state and action it never throws because of
  mutation, returns a new object when something changed, and the same inputs always give equal
  output. Tests cover every rule above (ticket AC "fully unit tested").
- AC27: A test renders a consumer component inside the provider; it shows a value from initial state,
  dispatches an action through `useAppState()`, and the rendered output updates.
- AC28: Using `useAppState()` outside the provider throws a clear error (tested).
- AC29: `npm test`, `npm run lint`, `npm run typecheck` and `npm run format` pass.

Added (gaps found while planning)
- AC30 (added): `setAxis` with a key not in the current kind's canonical order, or an index other
  than 0/1/2, leaves state unchanged. This is the AC11 rule applied to axes; "any stat key of the
  kind" in AC19 means keys in that kind's order.
- AC31 (added): `setCamera` with a non-finite `yaw` or `pitch` (NaN, Infinity) leaves state
  unchanged, so a bad drag delta cannot corrupt the camera.
- AC32 (added): an action that changes nothing (AC5, AC8 at the minimum, AC11, AC30, AC31, unknown
  action type) returns the same state reference, so React can skip the re-render. Actions that always
  reset fields (AC14, AC17) may return a new object.

## 3. Architecture

Approach: plain `useReducer` behind one React context (A9). The reducer needs league data (the
canonical stat order per kind and the default sort key) but must not contain it, so a factory builds
it from injected config: `createAppReducer(config)` returns a pure `(state, action) => AppState`.
No new dependencies.

### Files and exports

`web/src/domain/types.ts` (add, types only). The defaults object is a data-layer contract that a
later provider/API may serve, so its type lives in `domain/` and not in `state/`. That also avoids a
data -> state import.
- `interface KindDefaults { sel: EntityId[]; stats: string[]; ax: [string, string, string] }`
- `interface LeagueUiDefaults { season: Season; teamId: TeamId; unit: RosterUnit; sortKey: string;
  players: KindDefaults; teams: KindDefaults }`

`web/src/state/appState.ts` (pure TS, no React, no league literals):
- Types: `ViewMode = 'num' | '2d' | '3d'`, `Chart2Mode = 'bars' | 'radar'`,
  `TeamMode = 'compare' | 'inside'`, `AxisIndex = 0 | 1 | 2`, `Axes = [string, string, string]`,
  `PerKind<T> = Record<EntityKind, T>`, `SortDir = -1 | 1`, `RosterSort = { k: string; d: SortDir }`.
- `interface AppState` with exactly the fields in the requirements: `kind, season, sel, stats, ax,
  view, chart2, q, pos, addOpen, addStatOpen (string | null), teamMode, teamId, unit, tSort, yaw,
  pitch`.
- Constants (AC3): `MAX_SELECTED = 8`, `DEFAULT_YAW = -0.65`, `DEFAULT_PITCH = 0.38`,
  `PITCH_MIN = -0.2`, `PITCH_MAX = 1.3`, `ALL_POSITIONS = 'All'`.
- `canonicalStatOrder(defs: readonly StatDef[]): string[]` (design `ORDER`: groups in order of first
  appearance, then list order within each group; extras included).
- `interface ReducerConfig { statOrder: PerKind<readonly string[]>; defaultSortKey: string }`
- `createReducerConfig(defaults: LeagueUiDefaults, statDefs: PerKind<readonly StatDef[]>): ReducerConfig`
- `createInitialState(defaults: LeagueUiDefaults): AppState` (copies arrays so defaults objects are
  never shared or mutated; uses the generic constants for non-league fields).
- `createAppReducer(config: ReducerConfig): (state: AppState, action: AppAction) => AppState`
- `type AppAction`: a discriminated union with a string `type`. No enums, because
  `erasableSyntaxOnly` is on.

| `type` | payload | ACs |
|---|---|---|
| `toggleEntity` | `id: EntityId` | 4, 5, 6, 7 |
| `toggleStat` | `key: string` | 8, 9, 11, 13 |
| `addStat` | `key: string` (from menu; also sets `addStatOpen` null) | 9, 10, 11 |
| `toggleAddStatMenu` | `group: string` | 12 |
| `setKind` | `kind: EntityKind` | 14 |
| `setSeason` | `season: Season` | 15 |
| `setQuery` | `q: string` | 16 |
| `setPos` | `pos: string` | 16 |
| `toggleAdd` | none (flips `addOpen`, clears `q`) | 17 |
| `closeAdd` | none ("Done") | 17 |
| `setView` | `view: ViewMode` | 18 |
| `setChart2` | `chart2: Chart2Mode` | 18 |
| `setAxis` | `index: AxisIndex; key: string` | 19, 30 |
| `setCamera` | `yaw: number; pitch: number` | 20, 31 |
| `resetView` | none | 21 |
| `setTeamMode` | `mode: TeamMode` | 22 |
| `setTeam` | `teamId: TeamId` | 23 |
| `setUnit` | `unit: RosterUnit` | 24 |
| `sortRoster` | `key: string` | 25 |

Rules the coder must follow:
- `addStat` with an already-selected valid key still clears `addStatOpen` and leaves stats unchanged.
- `setKind` does not reset `addStatOpen` (A7).
- `toggleAdd` is allowed when 8 are selected (A6).
- The switch has an exhaustive `never` check, and its `default` branch returns `state` for unknown
  runtime actions (AC32).

`web/src/state/appStateContext.ts`: `AppStateContext = createContext<AppStateContextValue | null>(null)`
and `interface AppStateContextValue { state: AppState; dispatch: Dispatch<AppAction> }`. This lives in
its own file so component files export only components (react-refresh friendly).

`web/src/state/AppStateProvider.tsx`: `AppStateProvider({ defaults, statDefs, children })`. It builds
the config and reducer once (`useState` initializer) and calls
`useReducer(reducer, defaults, createInitialState)`. The context value is memoized on `state`. Props
that change after mount are ignored (stated in JSDoc); remount with a `key` to reset.

`web/src/state/useAppState.ts`: `useAppState(): AppStateContextValue`. Throws
`Error('useAppState must be used inside <AppStateProvider>')` when the context is null (AC28).

`web/src/state/index.ts`: barrel that re-exports the public API above.

`web/src/data/nfl/uiDefaults.ts` (the single place to change NFL defaults, A1/A2):
- `nflUiDefaults(): LeagueUiDefaults` returns a fresh copy on each call (same pattern as
  `playerStatDefs()`): season '2024', teamId 'phi', unit 'off', sortKey 'snap',
  players {sel ['allen','barkley','chase'], stats ['passYds','passTd','rushYds','recYds','scrim','totTd'],
  ax ['rushYds','recYds','totTd']}, teams {sel ['kc','det','bal'],
  stats ['ppg','ypg','third','papg','to','win'], ax ['ppg','papg','to']}.
- `nflStatDefsByKind(): Record<EntityKind, StatDef[]>` wraps `playerStatDefs`/`teamStatDefs`.
- Both are re-exported from `web/src/data/nfl/index.ts`.

No data/API/schema changes, no env vars, no Python changes.

### Test files
- `web/src/state/appState.test.ts`: every rule in AC4-AC25 and AC30-AC32, run against the NFL
  defaults, with deep-frozen state (local `deepFreeze` helper) for AC26.
- `web/src/state/appState.fixture.test.ts`: a non-NFL fixture (for example groups `Alpha`/`Beta`,
  keys `a1,a2,b1,b2,ax1` where `ax1` is an `Alpha` extra listed last, ids `e1..e9`, season `S9`,
  team `t1`, unit `u1`, sortKey `k1`). Runs the core case of every rule group (AC2), including the
  canonical order placing `ax1` inside `Alpha`.
- `web/src/state/noLeagueLiterals.test.ts`: imports the state source files with Vite `?raw` and
  asserts none of them contains a quoted literal (`'x'`, `"x"` or backtick-quoted) for any value
  from `nflUiDefaults()`, any NFL stat key, `NFL_SEASONS` or `ROSTER_UNITS` (AC2). Matching only
  quoted literals avoids false hits on short keys like `to` and `int`.
- `web/src/state/AppStateProvider.test.tsx`: a consumer shows `state.view` and the selection count,
  a button click dispatches, and the test asserts the output updates (AC27). Rendering the hook
  outside the provider throws (AC28; silence `console.error` in that test).
- `web/src/data/nfl/uiDefaults.test.ts`: `createInitialState(nflUiDefaults())` equals the AC1 object
  exactly; `nflUiDefaults()` returns fresh copies; default stat and axis keys exist in the NFL defs;
  default stats are already in canonical order.

## 4. Design

This ticket renders no UI, so there are no loading/empty/error/success screens, no breakpoints and
no visual accessibility work. States at the logic level:
- Initial: built synchronously from the defaults. There is no loading state because defaults and
  stat defs are synchronous (async defaults are out of scope).
- Error: using the hook outside the provider throws a clear message (AC28). Invalid actions are
  no-ops (AC11, AC30-AC32).
- Mobile/desktop: state does not depend on width; later tickets read the same state at every width.
- Accessibility: `addOpen` and `addStatOpen` stay the single sources for the popover and menu, so
  later components can drive `aria-expanded` from them. Nothing else is needed now.

## 5. Risk and security

- Input validation: stat keys are checked against the injected canonical order (AC11, AC30); the
  axis index is checked at runtime (AC30); camera values must be finite and pitch is clamped (AC20,
  AC31). Entity ids, seasons, teams and units are stored without data checks by design (out of
  scope, A8).
- Auth and data exposure: none. State is client-only, with no network, secrets or env vars.
- Failure modes and safeguards (each tied to a task):
  - Frozen or shared state gets mutated: deep-freeze tests (T6) and copied defaults in
    `createInitialState` (T1).
  - NFL literals leak into the state module: literal-scan test (T6).
  - An unknown runtime action crashes the app: the default branch returns state (T3).
  - Provider instances share one defaults object: `nflUiDefaults()` returns fresh copies (T2).
  - Default stats are not in canonical order and never get re-sorted: `uiDefaults.test.ts` asserts
    they are already canonical (T2).

## 6. Gaps check

- Auth: not applicable (no backend, no user data).
- Validation: covered in section 5; AC30 and AC31 added.
- Error handling: hook misuse error (AC28); invalid actions are no-ops (AC32).
- Mobile: not applicable (no rendering).
- Accessibility: not applicable yet; the state shape supports `aria-expanded` later.
- Config and env vars: none added. League defaults are config in `web/src/data/nfl/uiDefaults.ts`.
- Tests: Vitest and Testing Library are already set up (`web/src/test/setup.ts`); test files are
  listed above and per task.

## 7. Tasks

Each task is one commit and includes its tests (CLAUDE.md: tests with every behaviour change). Run
`npm run format`, `npm run lint`, `npm run typecheck` and `npm test` before each commit.

- T1 Types, constants, order and initial state. Add `KindDefaults`/`LeagueUiDefaults` to
  `domain/types.ts`. Create `state/appState.ts` with all types, constants, the full `AppAction`
  union, `canonicalStatOrder`, `createReducerConfig`, `createInitialState`, and a stub
  `createAppReducer` that returns `state` for every action (it compiles and the switch is
  exhaustive). Tests: `canonicalStatOrder` on the NFL player defs (`passYds, passTd, int, cmp, rate,
  passYpg, tdInt, rushYds, ...`) and on the fixture; generic fields from `createInitialState`.
  (AC1, AC3, order basis for AC9)
- T2 NFL defaults in the data layer: `data/nfl/uiDefaults.ts`, the re-export in
  `data/nfl/index.ts`, and `uiDefaults.test.ts`. (AC1, AC2)
- T3 Selection, kind, season, search, popover: `toggleEntity`, `setKind`, `setSeason`, `setQuery`,
  `setPos`, `toggleAdd`, `closeAdd`, and the unknown-action default. (AC4-AC7, AC14-AC17, AC32)
- T4 Stats: `toggleStat`, `addStat`, `toggleAddStatMenu`. (AC8-AC13, AC32)
- T5 Views, axes, camera, team breakdown: `setView`, `setChart2`, `setAxis`, `setCamera`,
  `resetView`, `setTeamMode`, `setTeam`, `setUnit`, `sortRoster`. (AC18-AC25, AC30, AC31)
- T6 Purity, fixture and literal guard: `deepFreeze` coverage across all actions,
  `appState.fixture.test.ts`, `noLeagueLiterals.test.ts`. (AC2, AC26)
- T7 Context and hook: `appStateContext.ts`, `AppStateProvider.tsx`, `useAppState.ts`,
  `state/index.ts`, `AppStateProvider.test.tsx`. (AC27, AC28)
- T8 Final verification: full `npm test`, `npm run lint`, `npm run typecheck`, `npm run format`, and
  a clean `npm run format:check`. Fix style issues only. (AC29)

### Parallel work (test-writer and coder)

Once T1 lands (types, action union and signatures fixed), the test-writer can work from the ACs
alone, without waiting for the coder:
- the rule tests for T3, T4 and T5 in `appState.test.ts`. They fail against the stub until the coder
  fills in each branch, which is the intended red/green signal;
- all of `appState.fixture.test.ts` and `noLeagueLiterals.test.ts` (T6);
- `AppStateProvider.test.tsx` (T7), written against the `AppStateProvider`/`useAppState` API above.

T2 (data defaults) does not depend on T3-T5, so either side can do it alongside them. The coder owns
T1, the reducer branches in T3-T5 and the T7 implementation. Tests must not be deleted or weakened
to make them pass (CLAUDE.md).

## 8. Open questions (none blocking; assumptions applied)

1. Should switching kind also close the add-stat menu (`addStatOpen = null`)? Assumed no (A7).
2. Is the added AC32 (same reference on a no-op) acceptable, or should every action return a new
   object? Assumed same reference; it only affects re-render behaviour.
3. When a season change leaves a selected id missing from that season's data, should it be pruned?
   Assumed no.
4. Should defaults later come per league from the provider/API instead of the static
   `data/nfl/uiDefaults.ts`? The `LeagueUiDefaults` type lives in `domain/` to allow this.
