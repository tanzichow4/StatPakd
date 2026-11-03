# T09 plan: Stat sidebar and Add stat menu

Source: `docs/tickets/T09-stat-sidebar.md`, requirements `docs/plans/00-requirements.md` (T09).
Runs non-interactively: the recorded assumptions in 00-requirements.md are treated as decided.

## 1. Goal and out of scope

Goal: below the entity picker, show a 232px stat sidebar beside an empty main content area. The
sidebar lists only the selected stats of the current kind, grouped by `StatDef.group`, lets the user
deselect stats (never the last one) and add any unselected stat of a group (including `extra` ones)
through an inline "+ Add stat" menu, by mouse or keyboard alone at 375px and 1280px.

Out of scope (from requirements): main panel content (Table / 2D / 3D, T10+); hiding the sidebar in
Team breakdown mode; arrow-key / type-ahead / ARIA `menu` roving focus in the menu; reordering stats,
persistence, URL state; changing 3D axes on deselect; animations; changing `DataProvider`, mock data
or stat definitions; a collapsible/drawer sidebar on narrow screens.

## 2. Acceptance criteria

AC1-AC26 are exactly as written in `docs/plans/00-requirements.md` (same numbers, same text; that
file is the contract and is not repeated here to avoid drift). Short index:

- Data and grouping: AC1 data from provider, no league literals; AC2 group order; AC3 only selected
  rows, canonical order; AC4 empty group keeps heading + Add; AC5 per-kind groups and selection;
  AC6 stale / loading / failure safe; AC7 unknown selected keys not rendered.
- Deselect: AC8 click / Space deselects; AC9 last stat locked and exposed as not changeable.
- Add menu: AC10 Add button only when the group has unselected stats; AC11 open / toggle / one at a
  time, items in definition order; AC12 `aria-expanded`, `aria-controls`, name "Add stat to <group>";
  AC13 pick selects in canonical position and closes; AC14 Escape; AC15 outside press; AC16 kind
  switch closes.
- Focus: AC17 open focuses first item; AC18 Escape returns to Add button; AC19 pick focuses new
  checkbox; AC20 outside close moves no focus; AC21 keyboard-only operation, visible focus.
- Layout: AC22 body row with sidebar region "Stats" + empty labelled main region; AC23 1280px;
  AC24 375px wraps, no horizontal scroll; AC25 existing behaviour unchanged.
- Tests: AC26.

Added (gap found: after a keyboard deselect the focused checkbox is removed from the DOM, so focus
falls to `<body>` and the keyboard user loses their place, which undermines AC21):

- **AC27 (added).** After a stat is deselected, focus moves to the next stat checkbox in the same
  group; if there is none, to the previous one; if the group has no rows left, to that group's
  "+ Add stat" button (which always exists then, because the group now has an unselected stat).

## 3. Architecture

### Reducer decision (AC14-AC16)

Decision: add one new action `{ type: 'closeAddStatMenu' }`. Do **not** change `setKind`.

- Reason: T06 deliberately pinned `setKind` to keep `addStatOpen` (test "AC14: does not reset
  addStatOpen (assumption A7)" in `web/src/state/appState.test.ts`). Changing `setKind` would invert
  that test; a new action leaves every existing test untouched and green. Escape and outside click
  need a close that is not a toggle anyway: an idempotent close is safe against ordering between the
  outside `pointerdown` and a following `click`.
- Exact reducer change in `web/src/state/appState.ts`:
  - `AppAction` gains `| { type: 'closeAddStatMenu' }`.
  - Case: `return state.addStatOpen === null ? state : { ...state, addStatOpen: null }`.
  - Pure, league-free, same-reference no-op (matches `closeAdd`).
- AC16 (kind switch) is handled in the sidebar: a `useLayoutEffect` in `StatSidebar` compares the
  current `kind` with a `prevKind` ref and, when it changed, dispatches `closeAddStatMenu`. Layout
  effect (not plain effect) so no frame with a stale open menu is painted. This covers kind switches
  that involve no pointer press (keyboard on the nav segmented control); `GlobalNav` is not touched.
  In addition the sidebar only treats a menu as open when `addStatOpen` names a group of the current
  kind's loaded defs that still has unselected stats (assumption 3), so a stale value never renders
  a menu.
- Existing T06 tests to update: **none change**. Extensions only (new action):
  - New `describe('T09: closeAddStatMenu')` in `appState.test.ts`: sets `addStatOpen` to null from
    'Passing'; changes nothing else (`changedOutside(before, s, ['addStatOpen'])` is `[]`).
  - Append to the AC32 no-op table: `['T09 closeAddStatMenu when already closed', initial,
    { type: 'closeAddStatMenu' }]`.
  - Append `{ type: 'closeAddStatMenu' }` to the AC26 purity `actions` list.
  - The existing "does not reset addStatOpen (assumption A7)" test stays as is and must stay green.

### Components and files (all new unless noted)

`web/src/components/sidebar/`
- `useStatDefs.ts`: `export function useStatDefs(kind: EntityKind): StatDef[]`. Same pattern as
  `useEntities`: `useDataProvider()` + `useActiveLeagueId()`, effect with a `cancelled` flag, result
  tagged `{ leagueId, kind, defs }` and returned only when it matches the current league and kind;
  returns `[]` while loading, on failure, when the league is null, or when stale (AC1, AC6).
- `groupStats.ts`: pure helper, no React.
  `export interface StatGroupModel { name: string; selected: StatDef[]; unselected: StatDef[] }`
  `export function groupStats(defs: readonly StatDef[], selectedKeys: readonly string[]): StatGroupModel[]`
  Groups in first-appearance order; `selected` = defs of the group whose key is selected, in
  definition order (equals canonical order); `unselected` = the rest, in definition order, extras
  included. Selected keys without a def are ignored (AC2, AC3, AC4, AC7, AC10, AC11, AC13).
- `StatSidebar.tsx` (+ `StatSidebar.module.css`): `export function StatSidebar()`. Reads
  `useAppState()`, calls `useStatDefs(kind)` and `groupStats`. Renders `<aside aria-label="Stats">`
  with one `StatGroup` per group. Owns: checkbox ref map (by stat key), Add-button ref map (by group
  index), pending-focus ref, the kind-change close effect, and the derived open group (assumption 3).
  Dispatches `toggleStat`, `addStat`, `toggleAddStatMenu`, `closeAddStatMenu`.
- `StatGroup.tsx` (+ `StatGroup.module.css`): `export function StatGroup(props)`. Props: `group:
  StatGroupModel`, `locked: boolean` (true when the kind has exactly one selected stat), `open:
  boolean`, `menuId: string`, `headingId: string`, `onDeselect(key, rowIndex)`, `onToggleMenu()`,
  `onPick(key)`, `onClose(reason: 'escape' | 'outside')`, `checkboxRef(key, node)`,
  `addButtonRef(node)`. Renders heading, rows, Add button and (when open) `AddStatMenu`. Owns the
  Escape key handler and the outside-press listener for its own open menu.
- `AddStatMenu.tsx` (+ `AddStatMenu.module.css`): `export function AddStatMenu({ id, groupName,
  items, onPick })`. Plain buttons; focuses its first item in a mount effect (AC17).
- `index.ts`: `export { StatSidebar } from './StatSidebar'`.

Modified
- `web/src/components/ui/Checkbox.tsx` / `.module.css` (additive, existing props unchanged):
  `className?: string` (merged on the `<label>` with `cx`), `inputRef?: Ref<HTMLInputElement>`,
  `locked?: boolean`. `locked` sets `aria-disabled="true"` on the input, keeps it focusable, and does
  not call `onChange` (React restores the controlled `checked`). CSS:
  `.box[aria-disabled='true'] { opacity: 0.5 }` (same look as `:disabled`, assumption 4). Native
  `disabled` is not used for the last stat because it removes the checkbox from the tab order, which
  would break AC21 ("reach every stat checkbox").
- `web/src/App.tsx`: inside `<main>` after `<EntityPicker />`:
  `<div className={styles.body}><StatSidebar /><section className={styles.panel} aria-label="Stat views" /></div>`.
- `web/src/App.module.css`: `.body` and `.panel` (values in section 4).
- `web/src/state/appState.ts`: `closeAddStatMenu` (above).
- `web/src/test/fixtureProvider.ts` (test data, additive): `fixtureSidebarStatDefs()` and
  `fixtureSidebarUiDefaults()` (contents in T5).

### Data and API

No DataProvider, domain type or mock-data change. No new state fields; one new action. Display order
comes from the loaded defs; the reducer's canonical order still comes from the defs passed to
`AppStateProvider` in `App.tsx` (same data, assumption 1).

### Dependencies

None added.

## 4. Design

### DOM and accessibility contract (tests are written against this)

- Sidebar: `<aside aria-label="Stats">` (role `complementary`, name "Stats").
- Group: `<div role="group" aria-labelledby={headingId}>` containing `<h2 id={headingId}>` with the
  group name, then a `<ul>` of `<li>` rows (omitted when the group has no selected rows), then the
  Add button, then the menu when open. DOM order = visual order = tab order.
- Row: `Checkbox` with `label = StatDef.label`, `checked`, `className` = row style, `locked` when the
  kind has exactly one selected stat. Role `checkbox`, name = label.
- Add button: `<button type="button" aria-expanded={open} aria-controls={open ? menuId : undefined}
  aria-label={`Add stat to ${group.name}`}>` with an `<span aria-hidden="true">+</span>` icon and
  visible text "Add stat" (label-in-name satisfied). Rendered only if `unselected.length > 0`.
- Menu: `<div id={menuId} role="group" aria-label={`Stats to add to ${group.name}`}>` with one
  `<button type="button">` per unselected def, text = label, definition order.
- IDs come from `useId()` plus the group index, never from group names (they may contain spaces).
- Main area: `<section aria-label="Stat views">` (role `region`), empty.

### User flow

1. Page loads: groups appear once defs resolve (no spinner; empty sidebar while loading).
2. Click/Space on a checked row: stat removed, focus per AC27. If one stat is left, it is dimmed and
   inert.
3. Click/Enter/Space on "+ Add stat": menu opens below it (pushes content down), focus to the first
   item. Opening another group's menu closes the first (reducer already does this).
4. Pick an item: stat added at its canonical position, menu closes, focus to the new checkbox. If
   that was the group's last unselected stat, the Add button disappears.
5. Escape (focus in the menu or on its Add button): close, focus back to the Add button; the keydown
   is stopped from propagating (assumption 8).
6. Pointer press outside the menu and its Add button: close, no focus move, no `preventDefault`, so
   the pressed control acts normally. Press on menu padding: stays open. Tab out of the menu: stays
   open (assumption 10).
7. Players/Teams switch: menu closes, the other kind's groups and selection show.

### Focus management

- Open: `AddStatMenu` mount effect focuses its first button (switching groups remounts it).
- Escape: `onClose('escape')` dispatches `closeAddStatMenu`, then focuses the group's Add button via
  the ref map (the button stays mounted because the group still has unselected stats).
- Pick: set `pendingFocus = { to: 'stat', key }`, dispatch `addStat`; a `useEffect` keyed on
  `state.stats[kind]` and the grouped model consumes it and focuses `checkboxRefs.get(key)`.
- Deselect: when not `locked`, set `pendingFocus = { to: 'afterRemove', groupIndex, rowIndex }` and
  dispatch `toggleStat`; the same effect focuses row `rowIndex`, else `rowIndex - 1`, else the
  group's Add button. When `locked`, nothing is dispatched and no pending focus is set.
- Outside press: `onClose('outside')` dispatches only; no focus call.
- Outside-press listener: registered in `StatGroup` only while `open`, on `document`,
  `'pointerdown'`, capture phase; ignores events whose target is inside the wrapper `<div>` holding
  the Add button and the menu (`wrapper.contains(event.target as Node)`); removed on close/unmount.
- Escape handler: React `onKeyDown` on the same wrapper; acts only when `open` and
  `event.key === 'Escape'`; calls `stopPropagation()` and `preventDefault()`.

### States

- Loading: sidebar region renders with no groups. Main area unchanged.
- Empty (provider returns `[]`): same as loading; no crash.
- Error (`getStatDefs` rejects): same as empty; nothing thrown.
- Success: groups as above. A group with no selected rows: heading + Add button only (AC4). A group
  with everything selected: rows, no Add button (AC10).
- Stale: an older league/kind response is ignored (AC6).

### Visual values (CSS modules, tokens from `web/src/styles/tokens.css`)

- `App.module.css .body`: `display:flex; flex-wrap:wrap; gap:var(--space-32);
  align-items:flex-start`. `.panel`: `flex:1 1 560px; min-width:0`.
- `StatSidebar.module.css .root`: `flex:0 0 232px; display:flex; flex-direction:column;
  gap:var(--space-16); min-width:0`.
- `StatGroup.module.css`: `.group` flex column gap 1px; `.heading` margin 0, `var(--text-11)`/600,
  uppercase, `letter-spacing:.08em`, `var(--color-text-label)`, padding `0 8px 6px`; `.list` reset
  list styles, flex column gap 1px; `.row` (passed to Checkbox) padding `7px 8px`, radius
  `var(--radius-7)`, `var(--text-14)`, `var(--color-ink)`, hover bg `var(--color-hover)`; `.add`
  full-width button, reset border/background, flex, gap 10px, padding `7px 8px`, radius 7px,
  `var(--text-13)`/600, `var(--color-text-muted)`, text-align left, hover bg `var(--color-hover)`
  and color `var(--color-ink)`; `.addIcon` 16px box, radius 4px, `1.5px dashed #BDBDB8`, "+" 12px,
  centred.
- `AddStatMenu.module.css .menu`: margin `2px 0 4px 26px`, bg white, border
  `1px solid var(--color-border)`, radius 8px, padding 4px, `box-shadow: var(--shadow-menu)`, flex
  column. `.item`: padding `7px 8px`, radius 6px, `var(--text-13)`, ink, text-align left, full
  width, reset border/background, `overflow-wrap:anywhere`, hover bg `var(--color-hover)`.
- No `overflow:hidden` on sidebar, group or menu (keeps the global `:focus-visible` outline visible).
- Focus: rely on the global `:focus-visible` rule in `web/src/styles/global.css` (2px
  `--color-focus` outline); verify it shows on the 16px checkbox, Add button and menu items.

### Widths

- 1280px: sidebar 232px left, main area right, top aligned, 32px gap (AC23).
- 375px: content box is 375 - 2 x 28 = 319px; the row wraps, sidebar stays 232px left aligned above
  the main area; the menu is at most 232 - 26 = 206px wide; no horizontal scroll (AC24).

## 5. Risk and security

- Input validation: no free-text input. Stat keys from menu clicks come from loaded defs; the
  reducer already ignores unknown or already-selected keys (`insertStat`). Group names are used only
  as text and `addStatOpen` values, never as DOM ids or selectors.
- Data exposure / injection: labels and group names render as React text (escaped); no
  `dangerouslySetInnerHTML`. No network beyond the existing provider; no auth surface.
- Failure modes and safeguards (as tasks):
  - Provider rejects or never resolves: hook returns `[]` (T4).
  - Stale response after kind/league switch: tagged-result check (T4, T6).
  - Defs and reducer canonical order disagree: display order comes from defs, so rows always stay
    grouped; the reducer ignores keys it does not know (existing tests).
  - Selected key with no def: not rendered (T3, T6).
  - Ordering between an outside `pointerdown` and the following `click` on another Add button: close
    is idempotent and the click then opens the other menu (T7).
  - Listener leaks: outside-press listener removed on close and unmount (T7).
  - Escape bubbling into other UI: `stopPropagation` (T7).
  - League literals creeping in: literal scan including labels (T9).
- Known limitation for a later ticket: if the sidebar is ever unmounted (Team breakdown mode), the
  kind-change effect cannot run; that ticket should dispatch `closeAddStatMenu` when hiding it.

## 6. Gaps check

- Auth: none in this app; nothing added.
- Validation: reducer guards plus def-derived keys (section 5).
- Error handling: loading / empty / rejected / stale all render no groups without crashing.
- Mobile: 375px wrap, fixed 232px, no horizontal scroll, menu within the sidebar (AC24, QA list).
- Accessibility: labelled regions, group headings, label-in-name Add buttons with
  `aria-expanded`/`aria-controls`, `aria-disabled` lock that stays focusable, focus moves for
  AC17-AC19 and AC27, visible focus, keyboard-only flow (AC21).
- Config and env vars: none needed; no `.env` change.
- Tests: reducer, Checkbox, pure helper, hook, component, App integration, literal scan (section 7).
  Oxlint-clean tests: no `expect` message argument, no `expect` inside `if`/ternaries/conditional
  branches, every test body contains at least one visible `expect` (helpers may throw but are never
  the only assertion), no `.skip`/`.only`.

## 7. Tasks

Order: T1-T5 are independent; T6 needs T2-T5; T7 needs T1 + T6; T8 needs T6; T9 any time after the
files exist; T10 last.

- **T1. Reducer `closeAddStatMenu`.** `appState.ts` change as specified; extend `appState.test.ts`
  (new describe, AC32 row, AC26 purity entry). No existing test edited. AC14, AC15, AC16, AC25.
- **T2. Checkbox additive props.** `className`, `inputRef`, `locked` in `Checkbox.tsx`; CSS rule in
  `Checkbox.module.css`. Extend the `ui.test.tsx` Checkbox describe: `locked` gives
  `aria-disabled="true"`, stays checked after click and after Space, `onChange` not called, still
  reachable by Tab; `inputRef` receives the input element; `className` lands on the label. Existing
  Checkbox tests unchanged. AC9, AC19, AC21.
- **T3. `groupStats` + `groupStats.test.ts`.** Cases: first-appearance group order with interleaved
  extras; `selected` in definition order regardless of `selectedKeys` order; `unselected` includes
  extras in definition order; unknown selected key ignored; group with nothing selected present with
  empty `selected`; fully selected group has empty `unselected`; empty defs give `[]`.
  AC2, AC3, AC4, AC7, AC10, AC11, AC13.
- **T4. `useStatDefs` + `useStatDefs.test.tsx`** (renderHook with a `DataSource` wrapper, fixture
  provider, `deferred`). Cases: resolves defs for the active league and kind; calls
  `getStatDefs(leagueId, kind)`; pending gives `[]`; rejection gives `[]`; after a kind switch, the
  old request resolving last never shows the old defs. AC1, AC6.
- **T5. Sidebar test fixture** in `web/src/test/fixtureProvider.ts` (additive exports, invented
  names only):
  - `fixtureSidebarStatDefs()` players, in this order (key/label/group): `zscore/Zscore/zalpha`,
    `zblip/Zblip/zalpha`, `zgrit/Zgrit/zbeta`, `zhum/Zhum/zbeta`, `zkilt/Zkilt/zgamma`,
    `zlorn/Zlorn/zdelta`, `zdrift/Zdrift/zalpha (extra)`, `zjolt/Zjolt/zbeta (extra)`. Teams:
    `ztpts/Ztpts/ztoff`, `ztwin/Ztwin/ztoff`, `ztblk/Ztblk/ztdef (extra)`.
  - `fixtureSidebarUiDefaults()`: `fixtureUiDefaults()` with
    `players.stats = ['zscore', 'zgrit', 'zkilt']`, `teams.stats = ['ztpts']`.
  - Resulting view: zalpha (row Zscore; menu Zblip, Zdrift), zbeta (row Zgrit; menu Zhum, Zjolt),
    zgamma (row Zkilt; no Add), zdelta (no rows; menu Zlorn); teams has one stat, so it is locked.
  - The same defs go to both `AppStateProvider statDefs` and
    `getStatDefs: vi.fn((_leagueId, kind) => Promise.resolve(defs[kind]))`.
- **T6. Sidebar rendering, deselect, add.** `StatSidebar`, `StatGroup`, `AddStatMenu`, `index.ts`
  and their CSS modules; deselect and pick dispatches; focus for pick (AC19) and deselect (AC27).
  `web/src/components/sidebar/StatSidebar.test.tsx` part 1. Render `DataSource` +
  `AppStateProvider` + `StatSidebar` + a state probe that prints `{ kind, stats, addStatOpen }` as
  JSON, has setKind buttons and a click counter button; use `findBy*` for the first render. Cases:
  - AC2/AC5: headings zalpha, zbeta, zgamma, zdelta in order; after setKind teams: ztoff, ztdef;
    back to players shows the earlier selection.
  - AC3: zalpha lists only Zscore, checked; no Zblip/Zdrift checkboxes.
  - AC4: zdelta shows its heading and "Add stat to zdelta", no checkbox.
  - AC7: defaults with an extra key that has no def: not rendered, other rows fine.
  - AC8: click on the label, click on the box, and Space on the focused checkbox each remove the row
    and the key from `stats.players`.
  - AC9: on teams (one stat) the checkbox has `aria-disabled="true"`, stays checked after click and
    Space, `stats.teams` unchanged; after adding Ztblk, Ztpts no longer has `aria-disabled`.
  - AC10: zgamma has no Add button; zalpha's Add button disappears after adding Zblip and Zdrift.
  - AC11: zalpha menu buttons are exactly [Zblip, Zdrift]; a second activation closes it; opening
    zbeta closes zalpha (exactly one group named /^Stats to add to/); Enter and Space both open.
  - AC12: `aria-expanded` "false" then "true"; while open `aria-controls` equals the menu's `id`;
    names "Add stat to zalpha", "Add stat to zbeta", "Add stat to zdelta".
  - AC13: add Zdrift, then Zblip: zalpha rows read Zscore, Zblip, Zdrift and `stats.players` equals
    `['zscore', 'zblip', 'zdrift', 'zgrit', 'zkilt']` (groups by first appearance, then definition
    order, extras included); the menu is closed after each pick.
  - AC17: after opening, the first menu item has focus. AC19: after a pick, the new checkbox has
    focus. AC27: deselecting a middle row focuses the next row; the last row focuses the previous
    row; the only row in a group focuses that group's Add button.
  - AC6: per-kind deferreds; switch to teams, resolve teams, then resolve players: only ztoff/ztdef
    headings; rejection: no headings, complementary "Stats" still present.
  AC1-AC13, AC17, AC19, AC27.
- **T7. Closing behaviour.** Escape handler, outside-press listener, kind-change layout effect.
  `StatSidebar.test.tsx` part 2:
  - AC14/AC18: Escape on a menu item closes and focuses "Add stat to zalpha"; Escape on the open Add
    button closes; a `document` keydown listener added by the test is not called for that Escape.
  - AC15/AC20: `user.click` on the probe counter button closes the menu, the counter still
    increments, and focus is on the counter button (not the Add button); a `user.pointer` press on
    the menu container (not an item) keeps it open; clicking zbeta's Add button while zalpha is open
    closes zalpha and opens zbeta.
  - AC16: open a menu, switch kind with `fireEvent.click` on the probe setKind button (no
    pointerdown, so only the kind effect can close it), switch back: no menu open, `addStatOpen`
    null.
  - Listener cleanup: after an Escape close, a later outside press leaves the probe state unchanged.
  AC14-AC16, AC18, AC20.
- **T8. App layout.** `App.tsx` + `App.module.css`. New `web/src/App.sidebar.test.tsx` (real App,
  mock data): complementary "Stats" and region "Stat views" exist and the sidebar follows the picker
  in DOM order; Players headings Passing, Rushing, Receiving, Totals; clicking Teams in the nav shows
  Offense, Defense, Overall; adding Passer Rating then Interceptions gives Passing rows Pass Yds,
  Pass TD, Interceptions, Passer Rating. `App.test.tsx`, `App.nav.test.tsx`, `App.picker.test.tsx`
  stay green unedited. AC2, AC5, AC13, AC22, AC25.
- **T9. `web/src/components/sidebar/noLeagueLiterals.test.ts`.** Same shape as the picker scan, over
  `StatSidebar.tsx`, `StatGroup.tsx`, `AddStatMenu.tsx`, `useStatDefs.ts`, `groupStats.ts`,
  `index.ts`, with the value list extended by every player and team `label`; includes the "files
  loaded" check, a planted-literal check, the "no `/data/` or MockProvider import" check, and
  "`useStatDefs` contains `useDataProvider`". AC1.
- **T10. Gate and browser check.** `npm test`, `npm run lint`, `npm run typecheck`,
  `npm run format`; then the QA list below. AC21, AC23, AC24, AC26.

Parallel work: the test-writer can write the T1-T4 tests, the T5 fixture, both parts of
`StatSidebar.test.tsx`, `App.sidebar.test.tsx` and T9 from the contracts in sections 3-4 while the
coder implements T1-T4, then T6-T8. The coder must not rename exports, roles or accessible names
without updating this plan.

### QA browser check (qa-tester, `npm run dev`)

At 1280px:
1. Sidebar 232px wide, left of the empty main area, top aligned, 32px gap; Players groups Passing,
   Rushing, Receiving, Totals with only the default stats as checked rows.
2. Headings 11px uppercase grey; rows 14px with hover background; Add rows 13px grey with a dashed
   16px "+" box.
3. Open Rushing's menu: inline below its Add row (Receiving moves down), lists Yds / Carry, Carries,
   Rush Yds / G; pick Carries: it appears after Rush Yds, the menu closes.
4. Open a menu, click empty page area: closes. Click another group's Add: the first closes, the
   second opens. Click inside menu padding: stays open.
5. Deselect stats until one remains: it is dimmed and clicking it does nothing.
6. Switch to Teams: Offense, Defense, Overall. Open a menu, then switch kind: closed. Switch back:
   Players selection intact.

Keyboard only (no mouse), at 1280px:
7. Tab from the top: nav, picker, then every stat checkbox and Add button in visual order, each with
   a visible focus ring.
8. Space on a checkbox deselects; focus lands on the next row (or previous row, or the Add button).
9. Enter on Add: menu opens, focus on the first item; Tab reaches every item; Enter picks and focus
   moves to the new checkbox. Space on Add also opens.
10. Open a menu, press Escape: it closes and focus is back on its Add button. Tab out of an open
    menu: it stays open. The last remaining stat is still reachable by Tab and announced as
    unavailable/dimmed.
11. Use the nav Players/Teams control by keyboard while a menu is open: the menu closes.

At 375px (device toolbar):
12. Sidebar stacks above the main area, 232px wide, left aligned; no horizontal scrollbar
    (`document.documentElement.scrollWidth <= 375` in the console).
13. Open the Passing menu (longest labels, e.g. Pass Yds / G, TD : INT): stays inside the sidebar,
    nothing overflows the viewport; repeat steps 8-10 by keyboard.
14. No console errors or React warnings throughout.

## 8. Open questions for the human

None blocking; work proceeds on the defaults. To confirm later:

1. Added AC27 (focus after deselect goes to the next row, else previous row, else the Add button):
   acceptable?
2. The last remaining stat uses `aria-disabled` (dimmed, still focusable) instead of native
   `disabled`, so keyboard users can reach it (AC21): acceptable, or should it look identical to
   other rows as in the design?
3. At 375px should the sidebar stretch to full width when stacked (assumed: stays 232px)?
4. Should arrow-key navigation inside the add-stat menu come in a later accessibility pass?
