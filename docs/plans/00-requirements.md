# T16 requirements: Share of team production stacked bars

Source ticket: `docs/tickets/T16-share-of-production.md` (its acceptance criteria are the contract).
Design references: `design_handoff_statpakd/README.md` section 5 (lines 46-49) and State Management
(line 71, `unit: 'off' | 'def'`); `design_handoff_statpakd/design/StatPakd App.dc.html` markup lines
166-177 (heading, unit toggle, share rows, legend) and script lines 196 (`COLORS`), 212-213
(`OFF_SHARE`, `DEF_SHARE`), 309-325 (`buildRoster`), 423-436 (`shares`, `segs`, `lead`, `legend`,
`last`), 450-451 (`unitTabs`).
Merged building blocks to reuse (do not change their existing behaviour unless stated below):
- `web/src/components/teams/` (T15): `TeamBreakdown` renders the team chips and the header card and
  nothing below them (T15 A2). T16 adds its section below the header card.
- `web/src/state/appState.ts` (T06): `unit` (`RosterUnit`, default `LeagueUiDefaults.unit`, `'off'`
  for the NFL), action `setUnit` (also resets `tSort`), `teamId`, `season`.
- `web/src/domain/provider.ts` / `types.ts` (T03): `getRoster(leagueId, teamId, unit, season)`,
  `RosterEntry { id, name, position, number?, stats }`, `RosterUnit` is an opaque string,
  `StatDef.summaryLabel` (T15 precedent for "a marker field on StatDef").
- `web/src/data/mockProvider.ts`, `web/src/data/nfl/builders.ts` (T04): `buildRoster` produces
  offense stats `snap, touch, tgt, scrim, td, ypt` and defense stats `snap, tkl, sk, int, pd, ff,
  take`; `ROSTER_UNITS = ['off', 'def']`.
- `web/src/components/ui`: `SegmentedControl`. `web/src/styles/series.ts`: `seriesColor(i)`.
  `web/src/lib/stats.ts`: `formatStat`.
- `web/src/test/fixtureProvider.ts`: invented-league fixture provider for component tests.

## Goal

In Team breakdown mode, below the team header card, show a "Share of team production" section with
an Offense/Defense (data-defined unit) toggle, one 100% stacked bar per share stat showing how each
roster player contributes, a leader line per stat, and a colour legend of the roster. The roster
units, their labels and which stats are share stats all come from the DataProvider, so components
stay league-agnostic and T17's roster table can reuse the same unit definitions.

## Acceptance criteria

`shares()` (pure function)

- AC1: A pure, exported `shares(values)` function takes an ordered list of stat values (`number`,
  `null` or `undefined`) and returns a list of integer percentages of the same length and order.
- AC2: `null`, `undefined`, zero and negative values count as 0 and always get 0%.
- AC3: When the sum of counted values is greater than 0, the percentages are non-negative integers
  that sum to exactly 100, computed by the largest-remainder method: each share starts at
  `floor(100 * v / total)`, and the leftover points go one each to the entries with the largest
  fractional remainders; equal remainders are broken by earlier position first. Examples that must be
  unit-tested: `[1, 1, 1]` -> `[34, 33, 33]`; `[2, 1]` -> `[67, 33]`; `[50, 50]` -> `[50, 50]`;
  `[5, 0, null, 5]` -> `[50, 0, 0, 50]`; `[7]` -> `[100]`.
- AC4: When the counted total is 0 (all zero/null/missing, or an empty list), every entry is 0 and the
  function returns no `NaN` or `Infinity`. `[]` -> `[]`.
- AC5: `shares()` does not mutate its input.

Data contract (league-agnostic unit and share definitions)

- AC6: The DataProvider exposes the roster units of a league (see Assumption A1): for each unit an
  opaque key, a display label and the stat definitions of that unit's roster stats, in display order.
  Share stats are marked on those stat definitions with a short share label; share rows render in
  definition order.
- AC7: For the mock NFL league the units are, in order, `off` labelled "Offense" and `def` labelled
  "Defense". Offense share stats, in order: `touch` "Touches", `tgt` "Targets", `scrim` "Scrimmage
  Yds", `td` "Touchdowns". Defense share stats, in order: `tkl` "Tackles", `sk` "Sacks", `take`
  "Takeaways", `pd` "Passes Defended". Each key matches a stat key produced by `buildRoster` for that
  unit (tested in the data layer).
- AC8: The MockProvider, the fixture provider and the domain contract tests are updated for the
  addition; for a disabled league it resolves to `[]` (same rule as the other methods).

Section placement and header

- AC9: In Teams + breakdown mode, below the team header card, a section is rendered containing an
  `h2` "Share of team production", a subtitle "How the workload splits across the roster" (13px,
  `#7A7A75`) and, to their right (wrapping below on narrow widths), the unit toggle. The section is
  not rendered in compare mode or Players mode, and is not rendered when the header card is not
  rendered (T15 AC14/AC19 cases: teams loading/failed or unknown `teamId`).
- AC10: The unit toggle is a segmented control with accessible name "Unit", one button per unit from
  the data, in data order, labelled with the unit label ("Offense", "Defense" for the mock data). The
  button whose key equals `state.unit` has `aria-pressed="true"`; the others `false`.

Toggle behaviour

- AC11: Clicking an inactive unit button dispatches `setUnit` with that unit's key; the rows switch
  to that unit's share stats and the bars, leaders and legend reflect that unit's roster for the same
  team and season. Clicking the active button changes nothing.
- AC12: The selected unit is the global `state.unit`: it persists across team chip changes, season
  changes and breakdown -> compare -> breakdown round trips (existing reducer behaviour).

Share rows

- AC13: One row per share stat of the selected unit, in definition order, laid out as a grid of
  `150px | minmax(0, 1fr) | 150px` with a 16px gap at desktop widths; rows are 12px apart.
- AC14: Left cell: the share label (14px/500) and below it the total text `` `${total} total` ``
  (11px, Geist Mono, `#9A9A95`), where `total` is the sum of counted values formatted with
  `formatStat` for that stat (en-US grouping, e.g. "1,234 total").
- AC15: Middle cell: a 30px tall bar, radius 5, 2px gap between segments, track background
  `#F3F3F0`, clipped (`overflow: hidden`). There is one segment per roster player whose value for the
  stat is greater than 0, in roster order; each segment's width is proportional to its value (design:
  `flex-grow = value`, `flex-basis: 0`, `min-width: 3px`), coloured with the player's legend colour.
- AC16: A segment shows its percentage as white 11px/600 text `"<pct>%"` when its `shares()`
  percentage is 9 or more, and no text when it is below 9.
- AC17: Right cell: `"Leader: <leader name> <pct>%"` (12px, `#555`, right aligned), where the
  leader is the roster player with the largest value (first in roster order on a tie), the leader
  name is the player's name without its first word (the full name if it has one word), and `pct` is
  that player's percentage from `shares()` (the same number shown in the segment and tooltip).
  Example with mock data: the default team's offense Touches row reads "Leader: Barkley NN%".
- AC18: All percentages shown in one row (segment text, tooltips, leader) come from a single
  `shares()` call over that row's roster values, so they are mutually consistent and the row's
  percentages sum to 100 when the total is greater than 0.

Zero total and missing data

- AC19: A stat whose counted total is 0 renders the empty track only (no segments, no percent text),
  the total text "0 total" and an empty right cell (no "Leader" text). No "NaN", "Infinity" or
  "undefined" appears anywhere in the section.
- AC20: An empty roster (`[]`) renders every share row as in AC19 and an empty legend; nothing
  throws.

Tooltips and accessibility

- AC21: Each segment has the tooltip text `` `${name} · ${value} (${pct}%)` `` (full player name,
  value formatted with `formatStat`, `·` is U+00B7), e.g. "Saquon Barkley · 378 (54%)". It is shown
  on mouse hover (a `title` attribute is acceptable for hover).
- AC22: Every segment is reachable with the Tab key (in roster order within a row, rows top to
  bottom), has the tooltip text as its accessible name, and while it has keyboard focus the tooltip
  text is visible on screen (not only in a `title` attribute) and a visible focus indicator is shown.
  Segments with percent text do not announce the bare percentage instead of the full tooltip text.
- AC23: Each bar has an accessible name that identifies its stat (e.g. "Touches share"), so a screen
  reader user knows which stat the segments belong to.

Legend

- AC24: Below the rows, a legend lists every roster player of the selected unit in roster order: a
  10x10 square (radius 2) in the player's colour and the full name (12px/500), wrapping with a 16px
  gap.
- AC25: Player colours are the series colours by roster index (`seriesColor(i)`: first player
  `#111111`, second `#E0472B`, ...), wrapping after 8, and are identical in the legend and the
  segments.

Loading, data changes and errors

- AC26: The section loads the roster with `getRoster(activeLeague, state.teamId, state.unit,
  state.season)`. Changing the team chip, the unit or the season reloads it; results of a superseded
  load are ignored (no flash of the previous team/unit/season after the new one has shown).
- AC27: While the unit definitions or the roster are loading, or if either load fails, the share rows
  and legend are not rendered and nothing throws; the heading, subtitle and toggle render once the
  unit definitions are available. No error text is required.
- AC28: If `state.unit` matches no unit from the data, no toggle button is pressed and no share rows
  or legend render; state is not changed automatically. Clicking a unit button then shows that unit.

Layout and league-agnosticism

- AC29: At a 375px viewport the section causes no page-level horizontal scroll: the label/total and
  the leader text remain fully visible (stacked above or below the bar), the bar spans the available
  width, and the toggle wraps below the heading if needed.
- AC30: No component, hook or model added or changed by T16 contains league-specific names or stat
  keys (`off`, `def`, `touch`, "Offense", player names, "NFL", etc.); the `noLeagueLiterals` test for
  `web/src/components/teams/` (and any new component folder) still passes.

Tests

- AC31: Unit tests for `shares()` cover AC1-AC5. Data-layer tests cover AC7-AC8. Component tests
  (Vitest + Testing Library, using invented fixture units, stats and roster) cover: the toggle
  (AC10-AC11), the leader text including a tie (AC17), the zero-total row (AC19), the empty roster
  (AC20), segment percent text threshold (AC16), tooltip text, keyboard focus and accessible names
  (AC21-AC23), legend order and colours (AC24-AC25), reload on team/unit/season change and stale load
  (AC26), loading/failure (AC27) and the unknown unit (AC28). Existing tests are not deleted or
  weakened.
- AC32: `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass in `web/`.

## Out of scope

- The roster table, column sorting, snap mini bars and leader pills (T17). T16 may define the full
  per-unit stat list in the data (A1) but renders none of it except the share rows.
- Responsive and accessibility polish beyond AC22/AC23/AC29 (T18), e2e tests (T19), pixel fidelity
  pass including exact toggle radius/padding (T20).
- The design's "Sample data for design purposes." footer.
- League switching, the Python API serving the new provider method (T22/T23); T22 inherits the
  contract.
- Changing compare mode, the Players view, team chips or the header card.
- Animations or transitions of bar segments.

## Assumptions

No human input was requested; each default below follows CLAUDE.md, `docs/plan.md`, T03/T15 notes and
the design handoff.

- A1 (where unit and share definitions come from; least invasive addition reusable by T17): T03 left
  the roster unit opaque and column/share definitions out of the DataProvider ("revisit in
  T15-T17"). Units, their labels and share stats are league-specific, so they must come from data.
  Add one new provider method returning the league's roster units, e.g.
  `getRosterUnits(leagueId): Promise<RosterUnitDef[]>` with
  `RosterUnitDef { key: RosterUnit; label: string; stats: StatDef[] }`, and one optional marker field
  on `StatDef` for share stats (e.g. `shareLabel?: string`), following the T15 `summaryLabel`
  precedent. The share label is separate from `label` because the design's share labels differ from
  the roster column labels ("Scrimmage Yds" vs "Scrim Yds", "Touchdowns" vs "TD", "Passes Defended"
  vs "Pass Def"), and `take` is a share stat but not a table column. The NFL unit stat lists include
  every roster stat `buildRoster` produces, labelled with the design's column labels (`OFF_COLS`,
  `DEF_COLS`), `ypt` with 1 decimal, and `take` ("Takeaways") marked `extra` so T17 can treat
  non-extra defs as columns. Defense defs are ordered `snap, tkl, sk, take, int, pd, ff` so share
  order (`tkl, sk, take, pd`) and column order (`snap, tkl, sk, int, pd, ff`) both follow definition
  order. A new kind on `getStatDefs` was rejected because `EntityKind` is used across the compare
  UI; `LeagueUiDefaults` was rejected because it is not served by the provider. The method is
  required on the interface (the fixture provider defaults it to `[]`) so T22 must serve it. The
  planner may choose exact names, provided AC6-AC8 and AC30 hold.
- A2 (`shares()` rounding): largest-remainder (Hamilton) method with earlier-index tie-break, so
  percentages sum to 100 (ticket AC). This deliberately differs from the design script, which uses
  independent `Math.round` per segment and a separate `Math.round` for the leader (can sum to 99 or
  101 and disagree with the segment). The 9% text threshold and leader percentage use these rounded
  values.
- A3 (zero/negative/null): treated as 0, excluded from segments (design filters `> 0`). A positive
  value can round to 0%; its segment still renders (3px minimum width) with "(0%)" in its tooltip.
- A4 (zero total): empty track, "0 total", no leader text (design: `lead` is `''` when total is 0).
- A5 (toggle state): the toggle uses the existing global reducer field `state.unit` and `setUnit`
  action (design keeps `unit` in app state, and T17 needs the same unit), not local component state.
  `setUnit` resetting `tSort` is existing behaviour and harmless for T16.
- A6 (placement): the section renders inside `TeamBreakdown`, directly below the header card, only
  when the header card renders (T15 left nothing below it). Order inside the section follows the
  design: heading row, share rows, legend. T17 will add the roster table below the legend.
- A7 (toggle look): reuse the existing light `SegmentedControl` as T15 did. The design's toggle has
  radius 8 / item radius 6 / padding `6px 14px` versus the shared control's radius 9 / `7px 16px`;
  that difference is deferred to T20. Accessible name "Unit" is generic.
- A8 (tooltip accessibility): ticket requires keyboard reachability and a text alternative. Each
  segment is a tab stop whose accessible name is the tooltip text, and a visible tooltip appears on
  focus (a native `title` alone is not shown on keyboard focus). This adds up to rows x players tab
  stops (28 for the mock offense); accepted per the ticket. The exact element/role is the planner's
  choice as long as AC22/AC23 are testable with Testing Library.
- A9 (leader name and ties): design uses `last(name)` = name without its first word (or the full
  name), and `reduce` with `>` so the first player in roster order wins a tie. Both kept. Uses only
  `RosterEntry.name`; no league-specific parsing.
- A10 (number formatting): totals and tooltip values use `formatStat` with the share stat's
  definition (en-US grouping). The design tooltip shows raw numbers; grouping is chosen for
  consistency with the total text.
- A11 (colours): colour by roster index via `seriesColor(i)` (design `COLORS[p.i]`), independent of
  the compare selection colours.
- A12 (loading/error): mirror T15/T08 patterns: render nothing for rows/legend while loading or on
  failure, ignore stale loads, no error message (T18 may add one). The heading and toggle stay
  visible once units are known so the user can still switch units.
- A13 (375px layout): the 150px/1fr/150px grid leaves no room for the bar at 375px, so below a
  narrow breakpoint (planner picks, consistent with existing breakpoints) the row stacks: label and
  total plus leader around a full-width bar. Desktop layout matches the design exactly.
- A14 (unknown unit): like T15's unknown team (A7 there), no auto-correction of `state.unit`; nothing
  renders below the toggle until a valid unit is chosen.

## Open questions

None blocking. Non-blocking, for the human to confirm later:
1. Is a new required `DataProvider` method for roster units plus an optional `StatDef` share marker
   (A1) acceptable as the contract that T17 and T22 inherit?
2. Should every segment be a tab stop (A8), or would one focusable bar per row with a text list of
   all players' shares be preferred to reduce tab stops (revisit in T18)?
3. Largest-remainder rounding (A2) means a segment's percent can differ by 1 from the design's
   `Math.round`; acceptable?
- A15 (autobuild): planner's open questions resolved by defaults: new required `DataProvider.getRosterUnits` + optional `StatDef.shareLabel` accepted as the contract T17/T22 inherit; every segment is a Tab stop (revisit in T18); largest-remainder rounding may differ by 1 from the design's Math.round; mobile breakpoint 480px; unknown unit skips the getRoster call.
