# T09 requirements: Stat sidebar and Add stat menu

Source ticket: `docs/tickets/T09-stat-sidebar.md` (its acceptance criteria are the contract).
References: handoff `design_handoff_statpakd/README.md` section 4 "Body" / "Stat sidebar",
"Interactions & Behavior" (responsive wrap), "State Management" (`stats`, `addStatOpen`) and
"Design Tokens"; design markup `design_handoff_statpakd/design/StatPakd App.dc.html` lines 68-73
(body row, sidebar, main panel) and script lines 411-417 (`groups`, `extras`, `canAdd`, `openAdd`).
Merged building blocks: `web/src/components/ui/Checkbox.tsx`, `web/src/styles/tokens.css`,
`web/src/domain/` (`StatDef`, `DataProvider.getStatDefs`), `web/src/dataSource/`
(`useDataProvider`, `useActiveLeagueId`), `web/src/state/` (`toggleStat`, `addStat`,
`toggleAddStatMenu`, `canonicalStatOrder`; fields `stats`, `addStatOpen`, `kind`),
`web/src/components/picker/useEntities.ts` (stale-result pattern), `web/src/App.tsx`.

## Goal

Below the entity picker, show a 232px stat sidebar beside a (for now empty) main content area. The
sidebar lists only the selected stats of the current kind, grouped by `StatDef.group`, lets the
user deselect stats (never the last one) and, per group, add any unselected stat of that group
(including `extra` ones) through an inline "+ Add stat" menu, all by mouse or keyboard alone at
375px and 1280px.

## Design values to match (from the handoff and design markup)

- Body row (inside the content container, below the picker row): flex row, gap 32px,
  `align-items: flex-start`, wraps.
- Sidebar: `flex: 0 0 232px`, flex column, gap 16px between groups.
- Group: flex column, gap 1px. Heading: 11px / 600, uppercase, letter-spacing .08em, `#8A8A85`,
  padding `0 8px 6px`.
- Stat row: padding `7px 8px`, radius 7px, gap 10px, 14px `#111`, hover bg `#F4F4F1`. 16px
  checkbox, radius 4px, checked = `#111` fill and border with white check.
- "+ Add stat" row: same box as a stat row, 13px / 600 `#7A7A75` (hover bg `#F4F4F1`, text
  `#111`). Icon: 16px box, radius 4px, `1.5px dashed #BDBDB8`, "+" 12px.
- Menu: inline (pushes content below it down, not an overlay), margin `2px 0 4px 26px`, bg `#fff`,
  border `1px solid #E3E3E0`, radius 8px, padding 4px, shadow `0 4px 12px rgba(0,0,0,.06)`, flex
  column. Item: padding `7px 8px`, radius 6px, 13px `#111`, left aligned, hover bg `#F4F4F1`.
- Main content area: `flex: 1 1 560px`, `min-width: 0`.

## Acceptance criteria

Data and grouping

- AC1. The sidebar's stat definitions come from the DataProvider (`getStatDefs`) for the active
  league and current kind; no group names, stat keys or stat labels are written in the sidebar
  component or its hook (checked by a no-league-literals test like the existing ones in
  `components/nav` and `components/picker`).
- AC2. Groups appear in order of first appearance in the definitions list, each with its group name
  as a heading. With the mock data: Players shows Passing, Rushing, Receiving, Totals; Teams shows
  Offense, Defense, Overall.
- AC3. Each group lists only the currently selected stats of that group, as checked checkboxes
  labelled with the `StatDef.label`, in canonical order. Unselected stats (including `extra` ones)
  are not listed as rows.
- AC4. A group with no selected stats still shows its heading and its "+ Add stat" control.
- AC5. Switching Players/Teams in the nav replaces the groups and rows with those of the other
  kind; each kind keeps its own selection.
- AC6. If stat definitions for a previous league/kind resolve after the user has switched, they are
  never displayed (a slower stale response cannot overwrite the current one). While definitions are
  loading, or if the request fails, the sidebar renders no groups and the app does not crash.
- AC7. Selected keys that have no matching definition are not rendered.

Deselect

- AC8. Clicking a checked stat row (box or label), or focusing its checkbox and pressing Space,
  deselects it; it disappears from the list and from `stats[kind]`.
- AC9. When exactly one stat is selected for the current kind, its checkbox stays checked, cannot be
  unchecked by click or Space, and is exposed to assistive tech as disabled/not changeable. As soon
  as a second stat is selected, it becomes deselectable again.

Add stat menu

- AC10. Each group ends with a "+ Add stat" button only while that group has at least one
  unselected stat (including `extra` ones). When all of a group's stats are selected, the button is
  not shown.
- AC11. Activating "+ Add stat" (click, Enter or Space) opens that group's menu directly below it,
  listing exactly that group's unselected stats by label, in definition order. Activating it again
  closes the menu. At most one menu is open at a time; opening another group's menu closes the first.
- AC12. The "+ Add stat" button exposes its state (`aria-expanded` true/false) and is associated
  with the menu it controls; its accessible name includes the group name (e.g. "Add stat to
  Rushing") so the buttons are distinguishable.
- AC13. Picking a menu item selects that stat, closes the menu, and the stat appears as a checked
  row in its group at its canonical position (e.g. adding "Pass TD"'s neighbour stats in any order
  always yields the definition order within the group, and groups never interleave).
- AC14. Pressing Escape while focus is inside the open menu (or on its toggle button) closes it.
- AC15. A pointer press anywhere outside the open menu and its toggle button closes the menu
  without performing any other side effect on that press beyond what the click target normally
  does. A press inside the menu (not on an item) does not close it.
- AC16. Switching Players/Teams closes any open add-stat menu.

Focus management and keyboard-only operation

- AC17. Opening a menu moves focus to its first item.
- AC18. Closing with Escape returns focus to that group's "+ Add stat" button.
- AC19. After picking an item, focus moves to the newly added stat's checkbox.
- AC20. Closing by outside click does not move focus programmatically.
- AC21. Using only Tab / Shift+Tab, Enter, Space and Escape, a user can: reach every stat checkbox
  and every "+ Add stat" button in visual order, deselect a stat, open a menu, reach every menu item,
  add a stat, and close a menu. Every focusable element shows a visible focus indicator.

Layout

- AC22. `App.tsx` renders, inside the content container and below the entity picker, a body row
  containing the sidebar followed by an empty main content area (a labelled landmark/region that
  T10+ will fill). The sidebar is a labelled region (e.g. "Stats").
- AC23. At 1280px viewport width the sidebar is 232px wide, to the left of the main content area,
  top-aligned, with a 32px gap.
- AC24. At 375px viewport width the body row wraps: the sidebar sits above the main content area,
  keeps its 232px width (left aligned), and the page has no horizontal scroll. An open menu stays
  within the sidebar's width (no overflow beyond the viewport).
- AC25. Existing behaviour (nav, entity picker, add popover and their tests) is unchanged.

Tests

- AC26. Component tests (Vitest + Testing Library, using the existing fixture provider) cover at
  least: AC2/AC5 (groups per kind from data), AC3, AC8, AC9, AC10, AC11, AC13, AC14, AC15, AC16,
  AC17-AC19, and AC6 (stale result ignored). `npm test`, `npm run lint`, `npm run typecheck` pass.

## Out of scope

- The main panel content: Table / 2D / 3D tabs and views (T10+). Only an empty placeholder area.
- Hiding the sidebar in Team breakdown mode (no team-mode switch exists yet; later ticket).
- Arrow-key navigation inside the menu, type-ahead, or ARIA `menu`/`menuitem` roving focus.
- Reordering stats, persisting selection across reloads, URL state.
- Changing the 3D axis selection when stats are deselected.
- Animations/transitions.
- Changing `DataProvider`, mock data or stat definitions.
- A collapsible/drawer sidebar on narrow screens.

## Assumptions

1. Stat definitions are loaded by a hook over `useDataProvider()` + `useActiveLeagueId()` keyed by
   league and kind, following the `useEntities` pattern (results tagged with their league/kind and
   ignored when not current; failure gives an empty list). The reducer's canonical order still
   comes from the defs passed to `AppStateProvider` in `App.tsx`; both describe the same mock data.
2. Selection and menu state live in the existing app state (`stats`, `addStatOpen`); the sidebar
   uses `toggleStat`, `addStat` and `toggleAddStatMenu`. Closing on Escape/outside click/kind
   switch may need a small state change (e.g. a close action or resetting `addStatOpen` in
   `setKind`); the planner decides how, keeping existing reducer tests passing.
3. The menu is "open" only if `addStatOpen` names a group of the current kind that has unselected
   stats (mirrors the design's `g.open = addStatOpen === g.name && g.canAdd`).
4. The last remaining stat is blocked rather than hidden; using the Checkbox primitive's disabled
   look (dimmed) for it is acceptable even though the design shows no disabled style, because it
   gives visible feedback for why the click does nothing.
5. At 375px the sidebar keeps its fixed 232px width above the main area (the design's
   `flex: 0 0 232px` with wrap), rather than stretching to full width.
6. The "+ Add stat" accessible name includes the group name; the visible text stays "Add stat".
7. Outside click is detected on pointer press (pointerdown/mousedown), so a press on another
   control both closes the menu and lets that control act normally.
8. Escape handling in the menu stops propagation so it does not also close other open UI.
9. Season changes do not affect the sidebar (stat definitions are per league + kind, not season).
10. Menu items are plain buttons reachable with Tab; Tab out of the menu does not close it.
11. Group names are unique within a kind and serve as group identity for `addStatOpen`.

## Open questions

None blocking; defaults chosen above. Non-blocking, for the human to confirm later:

1. At 375px, should the sidebar stretch to full width when stacked (assumed: stays 232px)?
2. Should the last remaining stat look dimmed/disabled (assumed: yes) or look identical to other
   checked stats with clicks silently ignored, as in the design?
3. Should arrow-key navigation inside the add-stat menu be added in a later accessibility pass?
