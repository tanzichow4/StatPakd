# T06 requirements: App state reducer and context

Source ticket: `docs/tickets/T06-app-state.md` (its acceptance criteria are the contract).
References: design README `design_handoff_statpakd/README.md` ("State Management", "Interactions &
Behavior", 3D chart, Team breakdown), design script
`design_handoff_statpakd/design/StatPakd App.dc.html` (initial `state` ~line 329-334, `toggle` ~335,
`toggleStat` ~342, `ORDER` ~271, `MAX` ~197, add-stat ~414, `openAdd` ~417, roster sort ~439,
`teamModeTabs` ~448, `unitTabs` ~451, `kindTabs` ~454, `onSeason` ~455, `toggleAdd` ~458, `posChips`
~460, `chart2Tabs` ~464, `axSel` ~472, `resetView` ~474, drag ~476). Domain types in
`web/src/domain/types.ts` (`EntityKind`, `EntityId`, `Season`, `TeamId`, `RosterUnit`, `StatDef`).
Mock data in `web/src/data/` (NFL stat defs in `nfl/statDefs.ts`, seasons/units in `nfl/builders.ts`).

## Goal

Provide one league-agnostic source of UI state for the web app: a pure reducer that enforces every
selection, stat, kind, season, view, camera and team-breakdown rule from the handoff, plus a React
context provider and `useAppState()` hook to read state and dispatch actions. The NFL-specific
defaults from the design (selected ids, stat keys, axes, team, roster unit, sort key, season) must be
supplied from the data/config layer, not written into the reducer.

## State fields (from the handoff, ticket scope list)

`kind` ('players' | 'teams'), `season`, `sel {players, teams}` (entity id arrays, order = series
colour index), `stats {players, teams}` (selected stat keys in canonical order), `ax {players, teams}`
(3-tuple of stat keys: x, y, z), `view` ('num' | '2d' | '3d'), `chart2` ('bars' | 'radar'), `q`
(search text), `pos` (position filter), `addOpen` (boolean), `addStatOpen` (group name | null),
`teamMode` ('compare' | 'inside'), `teamId`, `unit` (opaque roster unit), `tSort {k, d}` (sort key,
direction -1 = desc / 1 = asc), `yaw`, `pitch`.

Canonical stat order for a kind (design `ORDER`): groups in order of first appearance in that kind's
`StatDef[]` list, and within a group the `StatDef` list order, extras included. Example with the mock
player defs: `passYds, passTd, int, cmp, rate, passYpg, tdInt, rushYds, ...` (extras such as `passYpg`
sit inside their group, not at the end).

## Acceptance criteria

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

## Out of scope

- Any rendering or UI wiring (nav, picker, sidebar, charts, team breakdown are later tickets).
- Loading defaults asynchronously from `DataProvider` or an API; fetching entities/stat defs.
- Validating that ids/keys/seasons/teams exist in the data (e.g. rejecting unknown entity ids,
  pruning selections that do not exist in a newly chosen season).
- The design's `shown` field (written but never read in the design) and the `league` selection.
- Drag gesture math (dx/dy to yaw/pitch deltas) beyond the clamp; that belongs to T13/T14.
- Persistence (URL, localStorage), undo, and recomputation of data on season change.
- Search/position filtering logic itself (T08); `pos` is just stored.

## Assumptions

- A1: Defaults come from an injected defaults object (per kind: selected ids, selected stat keys,
  axes; plus season, teamId, unit, default sort key) and canonical stat order is derived from the
  kind's `StatDef[]` using the design `ORDER` rule. The NFL defaults object lives in the data layer
  (`web/src/data/...`) next to the mock data, not in the state module. Where the initial state cannot
  yet come from the provider, this config is the single place to change it.
- A2: Default season for the mock is '2024' (newest, matching `getSeasons` newest-first); `teamId
  'phi'`, `unit 'off'`, sort key `'snap'` are NFL data values and are part of the injected defaults.
- A3: `pos` uses the literal 'All' as the generic "no filter" sentinel, as in the design; it is not a
  league position code.
- A4: The max of 8 selected entities is a product rule, not league data, and is a constant in the
  state module.
- A5: Pitch clamping happens in the reducer so the rule is enforced in one place (the design clamps in
  the drag handler). Yaw is not clamped or wrapped.
- A6: Toggling the add popover is allowed even when 8 are selected (the design hides the add card in
  that case; the reducer does not block it). It always clears `q`.
- A7: Switching kind does not reset `addStatOpen` (ticket and design only reset `q`, `pos`,
  `addOpen`). A stale group name simply matches no group in the other kind.
- A8: Season, team, axis, view and stat values are typed as the domain types / design unions; the
  reducer does not check them against data.
- A9: State lives in `useReducer` behind one React context; tests use Vitest + Testing Library already
  set up in `web/`.

## Open questions

No blocking questions. Non-blocking, for the human later:
1. Should switching kind also close the add-stat menu (`addStatOpen = null`)? Assumed no (A7).
2. When a season change makes a selected id missing from that season's data, should it be pruned?
   Assumed no (out of scope; the handoff says season change keeps selections).
3. Should defaults eventually come from the provider/API per league (e.g. a "featured" list) instead
   of a static config in the data layer?
