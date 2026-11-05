# Plan: T18 Responsive and accessibility pass

Source: `docs/tickets/T18-responsive-and-a11y.md`. The contract is the T18 section of
`docs/plans/00-requirements.md`: AC1 to AC23 and assumptions B1 to B11. This is an unattended
autobuild run, so the plan does not wait for approval. The B-assumptions are the defaults for the
non-blocking questions. This plan adds one AC (AC24, marked below), because the contrast audit
found a real gap.

## 1. Goal and out of scope

Goal: make every StatPakd view usable at 375px, 768px and 1280px widths and operable with keyboard
and assistive technology, with no serious or critical axe issues. Change colours only where that is
needed to pass, and record every contrast decision in `docs/a11y.md` for later design sign-off.

Out of scope (carried over from the requirements):
- A Playwright test suite and CI job (T19). T18 browser checks are playwright-core QA scripts kept
  in the scratchpad, not committed e2e tests. Playwright is not added.
- Visual fidelity against the design (T20), including T15 chip shape/border and the T07 h1 note.
- 3D name-tag collision with 8 selected, and real-device drag performance (T14 carry-over).
- Implementing visual non-colour series encodings (dash patterns, shapes). These are a proposal only.
- Widths below 375px, 400% zoom reflow, `prefers-reduced-motion`, forced-colours modes, and manual
  screen-reader testing on real devices.
- The `/dev` page, getting design sign-off, league switching, new features, Python API changes.

## 2. Acceptance criteria (copied from 00-requirements.md, same numbers)

Views and widths. Unless stated otherwise, "every view" means: (V1) Players compare with the
default selection, on each tab Table, Bars, Radar and 3D; (V2) Teams compare, same four tabs;
(V3) the empty state (no entities selected); (V4) Add popover open (Players, with position chips);
(V5) add-stat menu open; (V6) Teams breakdown, Offense and Defense. "Checked widths" means 375x667,
768x1024 and 1280x800 CSS px viewports.

Responsive layout
- AC1: For every view at every checked width, the page has no horizontal scroll
  (`document.documentElement.scrollWidth <= clientWidth`). The compare table and roster table scroll
  horizontally inside their own bordered containers, which stay keyboard focusable with an
  accessible name.
- AC2: At every checked width no text or control is clipped or overlaps another (verified in browser
  QA by bounding boxes of headings, labels, buttons, chips, tabs and table containers), and the
  sidebar sits above the main area at 375px as today.
- AC3 (T08 carry-over): At 375x667 with the page scrolled to the top, opening the Add popover gives
  a popover whose bounding box lies entirely inside the viewport; its results list scrolls inside the
  popover and opening it does not increase the document height. At 1280x800 the popover keeps its
  design size (360px wide, results max-height 340px).
- AC4 (T12 carry-over): At 375px on the Teams radar with the default team stats, no two axis labels'
  bounding boxes intersect, no axis label's bounding box contains an outer-ring vertex, and every
  label is fully inside the chart box (no clipping).
- AC5 (T14 carry-over): At 375px on the 3D tab (Players and Teams, default camera), every axis
  label's bounding box is fully inside the chart card (none clipped by the card edge).

Touch targets
- AC6: At 375px and 768px, every interactive control (buttons including the entity remove ×, the
  Add card, popover Add/Remove/Done, position chips, team chips, tabs, segmented controls, selects,
  the search input, stat checkboxes via their clickable label, add-stat buttons and menu items,
  roster sort buttons, nav controls) has an activating element whose border box is at least 40px
  tall and at least 40px wide. Verified in browser QA by `getBoundingClientRect` on each control.
  Exemptions (listed in the a11y doc with reasons): share-of-production segments (their width
  encodes data) and the focusable scroll/chart regions (larger than 40px anyway).
- AC7: At 1280px the visual sizes match the current design-sized controls (no regression for
  desktop); any desktop control under 40px is listed in the a11y doc as a desktop exception.

Keyboard
- AC8: The full flow is operable with keyboard only, at 1280px and 375px: switch Players/Teams;
  change season; open the Add popover, type a search, filter by a position chip, add an entity,
  remove one from the popover, close with Done and with Escape; remove an entity with its card ×;
  open the add-stat menu, add a stat, close with Escape; uncheck/check a stat; switch each chart
  tab (arrow keys within the tablist); rotate the 3D chart with arrow keys and change an axis select;
  switch to Team breakdown; pick a team chip; toggle Offense/Defense; inspect share segments; sort a
  roster column both ways. Each step is covered by a component or App-level test using
  `@testing-library/user-event` keyboard interactions only (no clicks), or by an existing test that
  already does so (referenced in the plan).
- AC9: Focus is never lost to `<body>` during that flow: closing the popover (Done or Escape)
  returns focus to the Add card; closing the add-stat menu with Escape returns focus to its Add stat
  button; removing an entity with its card × moves focus to the next card's remove button, else the
  previous card's, else the Add card; removing an entity from inside the popover keeps focus in the
  popover. Tests assert `document.activeElement` after each of these.
- AC10: Tab order follows visual order at every checked width (DOM order matches visual order; no
  positive `tabindex`; no CSS `order`/reverse that changes visible order of focusable items). No
  focusable element is inside an `aria-hidden` subtree.
- AC11 (T16 carry-over): Each share-of-production row is a single Tab stop. Within a focused row,
  Left/Right arrows move between segments and Home/End go to the first/last segment; each segment
  keeps its current accessible name. With mock offense data the share section contributes at most one
  Tab stop per row (not 27 in total). Tests cover Tab count and arrow movement.
- AC12 (T16 carry-over): When a share segment has keyboard focus, its tooltip is visible and its
  horizontal centre lies within the focused segment's horizontal extent (clamped so the tooltip stays
  inside the share card). Verified in browser QA; a component test asserts the tooltip belongs to
  the focused segment.
- AC13: Every focusable element shows a visible focus indicator on keyboard focus, and that indicator
  has at least 3:1 contrast against the background it is drawn on (including the dark global nav).
  Verified by browser QA screenshots of each control type and by the contrast test (AC18) for the
  focus colour against the backgrounds it sits on.

Labels, names and live regions
- AC14: Every form control, button, tablist, region and table has an accessible name; icon-only
  buttons are named by action and target (e.g. "Remove <entity name>"). Covered by the axe tests
  (AC17).
- AC15: A single polite live region (`role="status"` / `aria-live="polite"`) is present in the DOM
  from first render (empty). Adding or removing an entity (from the popover or a card) and adding or
  removing a stat (menu or checkbox) sets its text to a message containing the verb ("added" or
  "removed", any capitalisation) and the entity name or stat label. Nothing is announced on initial
  load, on season change or on kind switch. Component/App tests cover each of the four cases and the
  no-announce cases. Messages use data-provided names only (no league literals in components).

Series encoding (non-colour)
- AC16: In every view where colour identifies a series (compare table header dots, bars, radar
  polygons, 3D points, share segments, roster colour squares), the same series and its values are
  available as text without relying on colour: a visible text label tied to the mark (entity name
  in the table headers, bars, 3D readout/name tags, share legend and roster rows) and an accessible
  text equivalent (existing radar sr-only list, share segment names, tables). A test per view asserts
  that each selected entity's name appears in the accessible content of that view. Visual
  non-colour encodings (dash patterns, marker shapes) are not implemented; they are written up as a
  proposal in the a11y doc (AC19).

Automated axe and contrast checks
- AC17: An automated Vitest test runs axe-core against the rendered App for every view V1-V6 (at the
  default jsdom size) and fails if any violation has impact "serious" or "critical". The
  `color-contrast` rule is disabled in that test only because jsdom cannot compute it (stated in a
  comment), and is covered by AC18 instead. The test lives with the other App tests and runs under
  `npm test`.
- AC18: A unit test computes WCAG contrast ratios for every text colour token (and hard-coded text
  colour) actually used for text, against each background it is used on (at least white and
  `--color-surface-subtle #FAFAF8`; dark nav surfaces for nav text), and asserts at least 4.5:1;
  and the focus colour against its backgrounds at least 3:1. Disabled-control text (nav "Soon"
  leagues, the locked last stat) is listed as an explicit, documented exemption in the test. The
  test reads the real values (e.g. parses `tokens.css`) so it fails if a token regresses.
- AC19: Browser QA (playwright-core scripts, as earlier tickets) runs axe-core with all rules,
  including `color-contrast`, on every view at 375px and 1280px against the dev or preview build and
  reports zero serious or critical violations; results are recorded in `docs/qa/T18-report.md`.

Contrast decisions document
- AC20: A file `docs/a11y.md` exists with (a) a contrast table: each text colour token or hard-coded
  colour, where it is used, its measured ratio on each background before and after, and the
  decision (changed to value X, or kept with reason), each marked "pending design sign-off"; (b) the
  touch-target and other exemptions (AC6/AC7); (c) the non-colour series encoding proposal (AC16);
  (d) the carried-over items from `docs/progress.md` and whether T18 fixed or deferred each.
- AC21: Colours are changed only where needed to pass AC18/AC19. Each changed colour is the closest
  value to the original (same hue, darkened only) that passes 4.5:1 on all its backgrounds; token
  names stay the same; no other visual change is made for contrast reasons.

Regressions and checks
- AC22: No component gains league-specific names; `noLeagueLiterals` tests still pass. Existing
  tests are not deleted or weakened; tests that pin a changed colour value or the old per-segment
  Tab behaviour are updated to the new documented behaviour, each noted in the plan.
- AC23: `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass in `web/`. Python
  checks (`ruff check .`, `pytest`) are unaffected and still pass.

Added by the planner
- AC24 (ADDED, gap found while re-measuring contrast): The percentage text drawn inside a
  share-of-production segment (`ShareRow`, white 11px text on `var(--series-N)`) meets 4.5:1 against
  its segment colour. Today, white text fails on 5 of the 8 series colours (2.60 to 4.19:1, see
  section 5). The fix chooses the text colour per series index: white where white passes, otherwise
  `--color-ink`. Series colours do not change. The AC18 test covers all 8 pairs. Reason: AC19 runs
  `color-contrast` in the browser and would fail on these segments. The aria-hidden text is still
  visible text (the same reasoning as B2). This is a deliberate exception to AC21's "darken the same
  hue" rule, because white text cannot be darkened while staying white. It is logged in
  `docs/a11y.md` as "pending design sign-off" and listed as open question 1.

## 3. Architecture

Approach: a CSS and component pass, with no state-shape or DataProvider changes. Most fixes are
local CSS (tokens, touch-target media rules), plus four small behaviours: the announcer, roving
focus in the share row, the tooltip anchor, and the compact radar/3D label geometry.

Components and where they live:
- `web/src/lib/contrast.ts` (new): pure `parseHex`, `relativeLuminance`, `contrastRatio`, with
  unit tests in `contrast.test.ts`.
- `web/src/styles/contrast.test.ts` (new): reads `tokens.css?raw` and module CSS files with `?raw`
  (the existing pattern used by `App.nav.test.tsx` and `CompareTable.test.tsx`). It holds a declared
  table of {foreground, background, use, min ratio} and an explicit exemption list (AC18, AC24).
- `web/src/styles/series.ts`: add `seriesTextColor(index)` returning `var(--color-white)` for series
  1, 3 and 6 and `var(--color-ink)` for 2, 4, 5, 7 and 8. It wraps like `seriesColor` (AC24).
- `web/src/components/a11y/` (new folder): `Announcer.tsx` (`AnnouncerProvider`, which renders one
  visually hidden `<div role="status" aria-live="polite">`), `useAnnounce.ts` (returns `announce(msg)`,
  or a no-op outside the provider so existing component tests are unaffected), `index.ts`,
  `Announcer.test.tsx`, and `noLeagueLiterals.test.ts`. If a message repeats the previous one, a
  zero-width space is appended so screen readers announce it again. The provider is mounted in
  `App.tsx` inside `AppStateProvider`, around `GlobalNav` and `AppMain`.
- Announcement call sites, so that only user actions announce (never effects on state): in
  `EntityPicker.tsx`, `toggleFromPopover` and `removeCard` announce `${entity.name} added` or
  `${entity.name} removed`. In the sidebar (`StatSidebar.tsx` / `StatGroup.tsx`), the menu pick and
  the checkbox change announce `${def.label} added` or `${def.label} removed`. Season change and kind
  switch have no call site, so they announce nothing.
- `web/src/lib/useMediaQuery.ts` (new): `useMediaQuery(query)` built on `matchMedia`. It returns
  false when `window.matchMedia` is missing (jsdom), so existing tests keep the desktop geometry.
- `radarModel.ts`: optional geometry override `{ r, labelT }`. `RadarChart.tsx` passes the compact
  geometry when `useMediaQuery('(max-width: 480px)')` is true (AC4).
- `chart3dModel.ts`: `axisLabelLayout` gains edge handling. A label anchored near the left edge
  never extends leftwards and one near the right edge never extends rightwards (it flips
  before/after). `Chart3D.module.css` gets a narrow rule for label size and wrapping (AC5).
- `ShareRow.tsx`: roving tabindex (only the active segment has `tabIndex=0`) and an `onKeyDown` on
  the group for ArrowLeft, ArrowRight, Home and End. The tooltip `left` is computed from the focused
  segment's `offsetLeft + offsetWidth/2` and clamped by a pure `tooltipLeft(centre, tipWidth,
  wrapWidth)` in `shareModel.ts` (AC11, AC12). The segment text colour comes from
  `seriesTextColor(i)`, added to the `ShareSegment` model next to `color`.
- `AddPopover.module.css`: a narrow rule `@media (max-width: 479px)` makes the popover a fixed sheet
  (`position: fixed; top/left/right: 8px; width: auto; max-height: calc(100dvh - 16px)`). It is a
  flex column, so `.results` is `flex: 1 1 auto; min-height: 0` and scrolls. Above 479px nothing
  changes (360px wide, results max-height 340px). The inline `left: -shiftLeft` (pinned by the
  existing AC35 test) is overridden in the narrow rule only, with `left: 8px !important` and a
  comment explaining why (AC3).
- Touch targets: each control's module CSS gets a `@media (max-width: 1023px)` block, placed after
  its base rules, setting `min-height: 40px; min-width: 40px` (and inline-flex centring where
  needed). Placing these blocks after the base rules matters, because `App.nav.test.tsx` and
  `CompareTable.test.tsx` regex-match the first `.dark {` / `.scroll {` block. `tokens.css` gets a
  comment documenting the 40px / 1023px convention. CSS variables cannot be used in media
  conditions, so the value is repeated.

Data and API changes: none. No env vars, no Python changes.

Dependencies: add `axe-core` as a web dev dependency (single package, no runtime dependencies,
MPL-2.0). It serves both the jsdom test (AC17) and the browser QA injection
(`page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })`, AC19). No matcher package:
a 15-line helper filters by impact, which avoids version coupling with Vitest 5. B4 fallback: if
`axe.run` cannot complete under jsdom 29 / Vitest 5 (it throws, hangs past 30s, or reports
jsdom-only false positives that cannot be fixed by configuration), AC17 is replaced by AC19 (browser
axe, all rules) plus AC18. The helper and smoke test are removed, `axe-core` stays for QA, and the
decision is recorded in `docs/a11y.md` and `docs/progress.md`.

## 4. Design

User flow: unchanged. Users see these changes:
- At 375 and 768px, controls grow to 40px targets.
- At 375px, the Add popover opens as a sheet pinned to the top of the viewport.
- Muted grey text is slightly darker.
- Some share segments use dark percentage text.
- Share rows are a single Tab stop, and arrow keys move between segments.
- The share tooltip sits over the focused segment.
- Screen readers hear "<name> added/removed".

States:
- Loading: the existing loading states keep their text. The live region is empty and announces
  nothing on load (AC15).
- Empty: V3 (no entities) must pass axe and AC1/AC6. Empty popover results ("No matches") use the
  darkened muted colour. A zero-total share row has no segments, so it has no Tab stop (existing
  AC19 test).
- Error: no new error states. The announcer never throws: outside the provider it is a no-op.
- Success: as today, plus announcements.

Widths:
- 375px: sidebar above main (unchanged). Popover as a fixed sheet. Compact radar geometry. 3D labels
  flip and wrap. 40px targets. Tables scroll inside their focusable regions.
- 768px: 40px targets. Popover anchored as on desktop. Normal radar geometry.
- 1280px: identical to today apart from the colour token values and the share-row keyboard model.

Accessibility needs: covered by AC8 to AC18. The focus ring is unchanged: `#2F5FD0` with a 2px
outline, white inside `.bar` on the dark nav, and ink on the 3D card.

## 5. Risk and security

Contrast re-measurement. I recomputed with the WCAG 2 formula from sRGB hex. The AC18 test
recomputes everything, so these hand values can be off by at most rounding. The requirements' hand
values were right for white. What they missed: muted text also sits on `--color-track #F2F2EF`
(inactive light segmented items, IconButton), the dark-grey family's first passing step on `#FAFAF8`
is one step darker than on white, and the share-segment text fails.

| Colour | Used on | Before | After value | After ratio |
|---|---|---|---|---|
| `--color-text-muted #7A7A75` | white / `#FAFAF8` / track `#F2F2EF` | 4.31 / 4.13 / 3.85 | `#6F6F6A` | 5.05 / 4.83 / 4.50 |
| `--color-text-label #8A8A85` | white / `#FAFAF8` | 3.47 / 3.32 | `#73736E` | 4.77 / 4.56 |
| `--color-text-faint #9A9A95` | white / `#FAFAF8` | 2.83 / 2.70 | `#73736E` | 4.77 / 4.56 |
| `--color-text-na #B5B5B0` | white / `#FAFAF8` | 2.06 / 1.97 | `#73736E` | 4.77 / 4.56 |
| `TeamModeSwitch` hard-coded `#7a7a75` | white | 4.31 | `var(--color-text-muted)` | 5.05 |
| `--color-nav-text #A5A5A0` | ink `#111` / nav surface `#2A2A28` | 7.63 / 5.81 | keep | n/a |
| `--color-nav-soon #6A6A66` | ink | 3.48 | keep, exempt (disabled, B3) | n/a |
| `#555555` (card ×, share leader), `#444444` (tile on `#F0F0ED`), `#333` (radar labels) | various | all above 6:1 | keep | n/a |
| focus `#2F5FD0` (needs 3:1) | white / `#FAFAF8` / `#F2F2EF` / `#F3F3F0` | 5.72 / 5.48 / 5.10 / 5.15 | keep | n/a |
| focus white in nav | ink / `#2A2A28` | 18.9 / 14.4 | keep | n/a |
| share text white on series 1/3/6 | `#111` / `#2F5FD0` / `#7B4FC9` | 18.9 / 5.72 / 5.52 | keep white | n/a |
| share text white on series 2/4/5/7/8 | `#E0472B` / `#14946A` / `#D9921A` / `#1A9AA8` / `#D6457F` | 4.11 / 3.84 / 2.60 / 3.37 / 4.19 | ink `#111` (AC24) | 4.59 / 4.92 / 7.26 / 5.60 / 4.51 |

Darkening method (AC21): subtract the same integer from R, G and B, which keeps hue 60° and the
5-unit blue offset. Pick the smallest step that passes on every background the AC18 test lists for
that colour. Every text token is tested on white and `#FAFAF8` as AC18 requires, and muted is also
tested on `#F2F2EF`. `#74746F` fails `#FAFAF8` (4.495), so label, faint and na take `#73736E`.
`#70706B` fails track (4.44), so muted takes `#6F6F6A` (4.503, marginal but passing). As a result,
label, faint and na become one value, and muted ends up darker than them. This loss of hierarchy
goes in `docs/a11y.md` (open question 2). Hover backgrounds are not text resting states, so they are
recorded in the doc rather than tested. For example, IconButton hover `#E6E6E2` with the × glyph
gives 4.04, which passes the 3:1 for icon glyphs.

Other risks and safeguards:
- Input validation and auth: no new inputs, no auth surface. Announcer messages are rendered as text
  nodes from provider data, not as HTML.
- Data exposure: none. The live region contains only names already on screen.
- axe in jsdom may not run, or may report jsdom artefacts. T1 is a smoke test that proves this
  before anything else depends on it. The B4 fallback is defined in section 3.
- axe may treat the nav "Soon" text as non-disabled. Safeguard (T2): check that the league buttons
  carry the `disabled` attribute. If browser axe still flags them, record it in the QA report and
  open question 3. Do not darken, per B3.
- Native `<select>` keyboard changes are not implemented by jsdom. The AC8 tests reach selects by
  Tab and then use `user.selectOptions` (documented in the test as a jsdom limitation). Browser QA
  confirms ArrowDown/Enter on the real select at 375 and 1280px.
- The `!important` override in the popover narrow rule is limited to one property and commented.
- Media-query CSS is invisible to jsdom, so touch targets, the popover sheet and label fits are
  verified only in browser QA (AC2 to AC7). Pure helpers (`tooltipLeft`, compact radar geometry,
  3D label flip) get unit tests.
- Roving tabindex changes the Tab behaviour that T16 tests pin. Those tests are updated, not
  deleted (listed in T8).

## 6. Gaps check

- Auth: not applicable (no auth in the app).
- Validation: no new user input. The announcer accepts strings only.
- Error handling: the announcer is a no-op without its provider, and `useMediaQuery` falls back when
  `matchMedia` is missing.
- Mobile: 375/768 targets, popover sheet, radar/3D label fits, no page overflow (AC1 to AC6).
- Accessibility: the core of the ticket (AC8 to AC19, AC24).
- Config and env vars: none added. `axe-core` is the only new dev dependency.
- Tests: new contrast, announcer, share keyboard, App axe and App keyboard tests. Updated tests are
  listed in T8 and T9. Browser QA goes in `docs/qa/T18-report.md`.

## 7. Tasks

Each task is one commit. Run `npm run lint`, `npm run typecheck` and `npm test` in `web/` before
each commit.

- T1. axe tooling (AC17 groundwork, AC23).
  - In `web/`, run `npm install -D axe-core` (this updates `package.json` and the lockfile).
  - Add `web/src/test/axe.ts` with `seriousViolations(root)`, which calls `axe.run(root, { rules: {
    'color-contrast': { enabled: false } } })` with a comment explaining that jsdom cannot compute
    colour (covered by AC18/AC19) and returns violations with impact serious or critical.
  - Add `web/src/test/axe.test.ts`. A well-formed snippet returns `[]`, and `<button></button>`
    returns a `button-name` critical violation, which proves the wiring. Use a timeout of 30s.
  - If this cannot pass, apply the B4 fallback from section 3 in this same commit: remove the helper
    and test, keep the dependency, and write a note in `docs/progress.md` Decisions.
- T2. Contrast helper, test and token changes (AC18, AC21, AC13).
  - Add `web/src/lib/contrast.ts` and `contrast.test.ts`, checked against reference values: black on
    white 21, `#777777` on white about 4.48, and equal colours 1.
  - Add `web/src/styles/contrast.test.ts`, which parses `tokens.css?raw` and asserts the pairs in
    section 5: text 4.5, focus 3, and the exemption list (nav-soon on ink; locked checkbox box; the
    disabled `ctaAdd` at opacity 0.4), each with a reason.
  - Change `tokens.css`: muted `#6f6f6a`; label, faint and na `#73736e`.
  - In `TeamModeSwitch.module.css`, change `#7a7a75` to `var(--color-text-muted)`.
  - Confirm that the GlobalNav "Soon" buttons have `disabled`.
  - Tests pinning old values: none found by search (no test pins `#7a7a75`, `#8a8a85`, `#9a9a95` or
    `#b5b5b0`).
- T3. Share segment text colour (AC24, AC18).
  - Add `seriesTextColor` in `series.ts` with tests in `web/src/styles/series.test.ts`.
  - Add `textColor` in `shareModel.ts` (with a `shareModel.test.ts` case) and render it in
    `ShareRow.tsx` as `color` in the segment style.
  - Add the 8 series/text pairs to `contrast.test.ts`.
  - `ShareOfProduction.test.tsx` asserts that the style contains `var(--series-N)`. That still
    holds, so no change is needed.
- T4. Announcer infrastructure (AC15).
  - Add `web/src/components/a11y/{Announcer.tsx,useAnnounce.ts,index.ts,Announcer.test.tsx,
    noLeagueLiterals.test.ts}` and mount the provider in `App.tsx`.
  - Tests: the region exists and is empty on first render; `announce` sets the text; a repeated
    message changes the node text; the hook is a no-op outside the provider.
- T5. Entity announcements (AC15, AC9).
  - In `EntityPicker.tsx`, call `announce` in `toggleFromPopover` and `removeCard`.
  - Add tests in `EntityPicker.test.tsx` (inside an `AnnouncerProvider`): add from the popover, remove
    from the popover, and remove by card × all announce "<name> added/removed".
  - Add a test that removing from inside the popover keeps `document.activeElement` inside the
    dialog. If it fails, fix `AddPopover.tsx` so the result CTA keeps the same button element
    across Add and Remove.
- T6. Stat announcements (AC15).
  - In `StatSidebar.tsx` / `StatGroup.tsx`, announce the menu pick (added) and the checkbox change
    (added or removed).
  - Add tests in `StatSidebar.test.tsx`.
  - Add App-level no-announce tests in `App.a11y.test.tsx` (created here): initial load, season
    change and kind switch leave the region empty.
- T7. Share row roving focus (AC11).
  - In `ShareRow.tsx`, add roving tabindex and ArrowLeft/ArrowRight/Home/End handling. Arrows stop at
    the ends (no wrap). The active index resets to 0 when the segments change.
  - Remove the `no-noninteractive-tabindex` disable only if lint allows.
  - Update `ShareRow.test.tsx` AC22 tests to the new behaviour:
    - "Tab walks the segments" becomes "Tab reaches only the first segment, the next Tab leaves the
      row".
    - "focusing a segment shows its tooltip" becomes Tab then ArrowRight.
    - "tooltip follows focus" becomes ArrowRight.
    - "shift-tab goes back" becomes ArrowLeft, plus a Shift+Tab-out case.
  - Add tests: Home/End, end stops, accessible names unchanged, and a zero-total row has no stop.
  - Update `ShareOfProduction.test.tsx` "Tab goes through the toggle, then each row's segments" to
    expect the toggle buttons and then the first segment of each row.
  - Add an App-level test in `App.teams.test.tsx`: with mock offense data, the share section has at
    most one `tabindex="0"` per row.
- T8. Tooltip anchor (AC12).
  - Add `tooltipLeft` in `shareModel.ts` with unit tests: centred, clamped left, clamped right, and
    tooltip wider than the wrapper.
  - In `ShareRow.tsx`, measure in a layout effect and set `left` with `transform: translateX(-50%)`
    adjusted by the clamp.
  - Test that the tooltip text matches the focused segment after arrow moves.
- T9. App-level axe and structure tests (AC17, AC14, AC10, AC16).
  - In `web/src/App.a11y.test.tsx`, render `App` (mock provider, B11) and reach V1 to V6 with
    `user-event`. On each view, `expect(await seriousViolations(document.body)).toEqual([])`.
  - AC10 checks: no `[tabindex]` greater than 0, and no focusable element inside `[aria-hidden=
    "true"]`. A static check uses `import.meta.glob('./**/*.module.css', { query: '?raw', eager: true
    })` to assert there is no `order:` and no `-reverse` in any module CSS.
  - AC16: in each view, each selected entity's name is found by role or text in that view's
    accessible content (table headers, bars text, radar sr-only list, 3D readout, share segment
    names, roster row headers).
  - Fix any violations found in the component that owns them. If T1 fell back, this task keeps only
    the AC10 and AC16 parts.
- T10. App keyboard flow (AC8, AC9).
  - Add `web/src/App.keyboard.test.tsx` with keyboard-only steps not already covered. These are: the
    Players/Teams switch, season (Tab plus `selectOptions`, with the jsdom note), Escape-close of the
    popover returning focus to the Add card, chart tabs via arrows at App level, 3D arrow rotation
    and axis select, switching to breakdown, team chip by Enter, Offense/Defense by Enter, share
    arrows, and roster sort both ways.
  - Steps already covered, cited in the test file header:
    - `EntityPicker.test.tsx`: AC22 Done/Escape focus, AC25 card removal focus order, and AC27 open,
      search, chip, add.
    - `StatSidebar.test.tsx`: AC14 Escape returns focus to the Add button, and AC21 full keyboard
      cycle.
    - `ComparePanel.test.tsx`: tab arrows.
    - `Chart3D.test.tsx`: keys.
    - `RosterTable.test.tsx`: AC15 Enter/Space sort.
    - `TeamChips.test.tsx`: AC13.
  - Assert `document.activeElement !== document.body` after each AC9 step.
- T11. Popover at narrow widths (AC3).
  - Add the `@media (max-width: 479px)` sheet rule and the flex column with a scrolling results list
    in `AddPopover.module.css`. Desktop values are unchanged.
  - No jsdom-visible change. The existing AC35 shift test stays as it is. Verify in browser QA.
- T12. Radar compact geometry (AC4).
  - Add `web/src/lib/useMediaQuery.ts` and `useMediaQuery.test.tsx` (stubs `matchMedia`, covers
    missing `matchMedia`, change events).
  - Add a `radarModel` geometry override with tests: compact labels lie at the larger `labelT`, and
    the default output is unchanged.
  - Wire it in `RadarChart.tsx`. Tune the starting values (r 120, labelT 1.2) in browser QA against
    the Teams default stats, and adjust the narrow `.axisLabel` rule in `RadarChart.module.css` if
    needed.
- T13. 3D axis labels at narrow widths (AC5).
  - Add edge flipping in `axisLabelLayout`, with `chart3dModel.test.ts` cases for a left-edge
    anchor, a right-edge anchor and the unchanged centre.
  - Add a narrow rule in `Chart3D.module.css` (10px, `max-width: 40%`, wrap).
  - Existing `Chart3D.test.tsx` CSS pins (`.grid`, `.edge`, `.dot`, `.unselected .drop`) are
    unaffected.
- T14. Touch targets part 1: picker and nav (AC6, AC7). Add `@media (max-width: 1023px)` blocks
  after the base rules in these files:
  - `EntityCard.module.css` `.remove`
  - `IconButton.module.css` `.btn`
  - `AddCard.module.css`
  - `AddPopover.module.css` (`.search`, `.done`, `.chip`, `.ctaAdd`, `.ctaRemove`)
  - `GlobalNav.module.css` `.league`
  - `Select.module.css` `.select` (the base `.dark` padding stays, so the `App.nav.test.tsx` pin
    holds)
  - `SegmentedControl.module.css` `.item` (all variants)
- T15. Touch targets part 2: sidebar, compare, teams (AC6, AC7). Add the same blocks to:
  - `Tabs.module.css` `.tab`
  - `StatGroup.module.css` `.row` (clickable label) and `.add`
  - `AddStatMenu.module.css` items
  - `AxisControls.module.css` buttons
  - `Chip.module.css` (team chips)
  - `RosterTable.module.css` `.sortButton` (inline-flex with min size; header padding kept so
    columns do not grow at 1280)
- T16. Overflow and layout fixes (AC1, AC2).
  - Run the QA measurement script at 375, 768 and 1280 for V1 to V6: `scrollWidth`, plus
    clipping/overlap bounding boxes. Fix only what it finds, in the owning module CSS (known
    candidates: `App.module.css` `.content` padding at 375, `GlobalNav` wrap with the larger
    targets, `ShareRow` grid at 768, `TeamHeader` wrapping).
  - The compare and roster scroll regions are already focusable and named (`CompareTable.test.tsx`
    AC20, `RosterTable.test.tsx` AC23). Keep those tests unchanged.
- T17. `docs/a11y.md` (AC20). Include:
  - The contrast table from section 5 with final measured values, each marked "pending design
    sign-off".
  - The AC24 note.
  - Exemptions: share segments, scroll and chart regions, desktop controls under 40px measured in
    QA, disabled text, and `--color-chart-muted` unselected 3D points.
  - Hover backgrounds.
  - The non-colour encoding proposal (radar dash patterns per series index; 3D marker shapes
    circle, square, triangle and diamond, then repeating).
  - Carry-overs: T08, T12, T14 axis labels, T16 Tab stops and tooltip are fixed; T14 name tags and
    performance are deferred; T15 and T07 go to T20.
- T18. Browser QA and final checks (AC19, AC1 to AC7, AC12, AC13, AC22, AC23).
  - Run the playwright-core scripts in the scratchpad: axe-core injected with all rules on V1 to V6
    at 375 and 1280; AC1 to AC7 measurements; AC12 tooltip centre; focus screenshots per control
    type; keyboard select at both widths. Write `docs/qa/T18-report.md`.
  - Run `npm run lint`, `typecheck`, `test` and `build` in `web/`, and `ruff check .` and `pytest`
    at the root.
  - Update `docs/progress.md`.

Tests updated (AC22), and nothing else:
- `ShareRow.test.tsx`: the AC22 keyboard block, which moves from per-segment Tab to one stop with
  arrows (T7).
- `ShareOfProduction.test.tsx`: the AC22 "Tab goes through the toggle, then each row's segments"
  test (T7).

No test pins a changed colour value. The `ShareOfProduction.test.tsx` style assertions that check
for `var(--series-N)` still hold.

## 8. Open questions (none blocking; defaults applied)

1. AC24: is ink percentage text on the five lighter series colours acceptable? The alternative is to
   darken those series colours (a larger visual change). Default: ink text, pending design
   sign-off.
2. Approve `#6F6F6A` for muted and `#73736E` for label, faint and na? Label, faint and na collapse
   into one value, and muted becomes the darkest grey. Should design pick a different hierarchy
   that still passes? Default: the minimal darkening values above.
3. If browser axe flags the disabled nav "Soon" text, should it be treated as an accepted exception
   (B3) or darkened? Default: exception, documented.
4. Should controls also meet 40px at 1280px (B5)? Default: no, desktop exceptions documented.
5. Adopt a visual non-colour series encoding for radar and 3D (B9)? Default: proposal only.
