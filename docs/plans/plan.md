# Plan: T19 Playwright e2e tests in CI

Source: `docs/tickets/T19-e2e-tests.md`. The contract is the T19 section of
`docs/plans/00-requirements.md`: AC1 to AC22 and assumptions B1 to B13. This is an unattended
autobuild run, so the plan does not wait for approval. The B-assumptions are the defaults for the
non-blocking questions. AC11 is read as written: the "last remaining stat cannot be removed" rule
needs no e2e coverage. No new AC is added. Section 3 lists where the real UI differs from the
wording of the requirements and how each AC is read against it.

## 1. Goal and out of scope

Goal: add a committed Playwright end-to-end suite that runs the main StatPakd user flows against
the production build at 375px and 1280px. Run it in GitHub Actions as its own CI job, which installs
Chromium and uploads traces when a test fails.

Out of scope (carried over from the requirements):
- Firefox and WebKit projects, `isMobile` or touch emulation, and a 768px project.
- Visual regression or screenshot tests, and axe checks in e2e (T18 and T20 cover these).
- Keyboard-only flows, 3D keyboard rotation, axis select changes and share-segment tooltips.
- Testing against the Vite dev server, the Python API or real data (T22/T23).
- Changing app behaviour or UI to suit tests, beyond adding missing accessible names (AC21). This
  plan needs no `web/src` change (see 3.4).
- Running CI on `autobuild` or ticket branches, caching browsers in CI, sharding, and blob/merge
  reports.
- Editing `CLAUDE.md` (open question 1).

## 2. Acceptance criteria (copied from 00-requirements.md, same numbers)

Tooling and configuration
- AC1: `@playwright/test` is a `devDependency` in `web/package.json` (lockfile updated); no runtime
  dependency is added. `playwright-core` is not added separately.
- AC2: `web/playwright.config.ts` exists and defines: `testDir` `./e2e`; a `webServer` that serves
  the production build with `vite preview` (building first) on a fixed host and port
  (`127.0.0.1:4173`, `--strictPort`), with `baseURL` pointing at it and `reuseExistingServer` only
  when not in CI; two projects named for their widths (e.g. `mobile-375` with viewport 375x667 and
  `desktop-1280` with viewport 1280x800), both Chromium; `trace: 'retain-on-failure'`; test output
  under `web/test-results/`; `forbidOnly` in CI.
- AC3: `npm run test:e2e` in `web/` runs `playwright test` and, from a clean checkout with the
  browser installed, builds and serves the app and runs every e2e test in both projects. The root
  `package.json` gains a forwarding `test:e2e` script like the existing ones.
- AC4: `npm test` (Vitest) does not collect any file under `web/e2e/`; its test count is unchanged
  from before T19 apart from any tests deliberately added for T19.
- AC5: `web/e2e/**/*.ts` and `web/playwright.config.ts` are type-checked by `npm run typecheck`
  (and therefore by `npm run build`), linted by `npm run lint` with zero errors, and formatted by
  `npm run format:check`. Lint rules for `web/src` are not weakened to achieve this.
- AC6: Playwright output folders (`test-results/`, `playwright-report/`, `blob-report/`,
  `playwright/.cache/`) are ignored in `web/.gitignore` and `web/.prettierignore`; after a run
  `git status` shows no new untracked output files.

Test quality
- AC7: Each test title states a user-visible behaviour (e.g. "adding entities stops at 8 and
  removing one reopens a slot"), not an implementation detail or a ticket/AC number only.
- AC8: No fixed sleeps: `web/e2e/` contains no `waitForTimeout`, `setTimeout`, or `sleep` calls.
  Waiting is done with Playwright's auto-waiting locators and web-first assertions (`expect(locator)`
  matchers), and elements are located by role, label or text (accessible locators), with test ids or
  CSS selectors only where no accessible locator exists (each such case commented).
- AC9: Reliability: `npx playwright test --repeat-each=3 --retries=0` passes with zero failures and
  zero flaky results locally across both projects. The config uses `retries: 0` locally and at most
  1 in CI. Tests are independent (each starts from a fresh page at `/`) and can run in parallel.

Flows covered (each runs in both the 375px and 1280px projects)
- AC10 (entities up to 8): on Players, starting from the default selection, the user adds entities
  through the Add popover until 8 are selected; then the Add card is gone (or the popover shows the
  remaining options disabled), the card list shows 8 entity cards, and an unselected option cannot be
  added. Removing one entity with its card remove button leaves 7 cards and the Add card returns
  showing "1 of 8 slots open". Removing an entity from inside the popover also reduces the count.
- AC11 (change stats): unchecking a selected stat in the sidebar removes that stat's row from the
  compare table; adding a stat through an "Add stat" menu adds its row; re-checking restores it.
  The last remaining stat in a group cannot be removed is not required to be covered here.
- AC12 (chart tabs): switching tabs Table, Bars, Radar and 3D each shows that view (the compare table;
  the bars with each selected entity's name; the radar chart; the 3D chart region) and hides the
  previous one; the selected tab has `aria-selected="true"`.
- AC13 (3D drag): on the 3D tab, dragging with the mouse across the "3D chart" region (pointer down,
  move, up) changes the projected position of at least one plotted point (its rendered coordinates
  or bounding box differ from before), and clicking "Reset view" returns the points to their initial
  positions.
- AC14 (Teams breakdown and sorting): switching to Teams and to Team breakdown shows the team chips,
  header card, share of production and roster table; picking a different team chip updates the header
  card's team name; toggling Offense/Defense changes the roster columns; clicking a roster column
  header sets its `aria-sort` to "descending" and the rows are in descending order of that column's
  values, clicking again sets "ascending" with rows in ascending order (null/"—" values last in both).
- AC15 (season switch): changing the "Season" select to the other season updates its selected value
  and changes at least one displayed stat value in the compare table (mock data differs by season);
  switching back restores the original value.
- AC16 (Players/Teams switch resets filter): on Players, open the Add popover, type a search query
  and pick a position chip so the result list is filtered; switch to Teams and back to Players; on
  reopening the popover the search box is empty, the "all positions" chip is the selected one, and
  the unfiltered results are shown. Also, the popover is closed after the switch.
- AC17 (no horizontal page scroll): in the `mobile-375` project, at the end of the AC12 and AC14
  flows, `document.documentElement.scrollWidth <= clientWidth`.

CI
- AC18: `.github/workflows/ci.yml` gains a separate job `e2e` (existing `test` and `web` jobs
  unchanged) on `ubuntu-latest` with `working-directory: web`, `actions/checkout@v4`,
  `actions/setup-node@v4` (`lts/*`, npm cache on `web/package-lock.json`), `npm ci`,
  `npx playwright install --with-deps chromium`, then `npm run test:e2e`. It runs on the same
  triggers as the other jobs.
- AC19: On failure the job uploads traces with `actions/upload-artifact@v4` under
  `if: ${{ failure() }}` (or `!cancelled()` restricted to failure output), uploading
  `web/test-results/` (which contains `trace.zip` files) and the HTML report if generated, with a
  bounded `retention-days` (e.g. 7). The CI reporter includes `github` so failures annotate the run.
- AC20: CI cannot be run from this environment, so "CI job green" is satisfied by: (a) running the
  same commands as the job locally in `web/` (`npm ci`, browser install or the cached Chromium,
  `npm run test:e2e`) with all tests passing; (b) the workflow file parsing as valid YAML with a
  YAML parser, and its `e2e` job containing every step listed in AC18/AC19 (checked by reading the
  file; `actionlint` if available); and (c) a deliberately failing temporary test producing a
  `trace.zip` under `web/test-results/` with the configured trace setting, after which the temporary
  test is removed. Results of (a)-(c) are recorded in the QA report for T19.

Regressions and checks
- AC21: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test` and `npm run build`
  pass in `web/`; no existing test is deleted or weakened; no component or source file under
  `web/src/` changes behaviour (any `web/src` change needed for testability is limited to accessible
  names or attributes and is listed in the plan).
- AC22: Python checks (`ruff check .`, `pytest`) are unaffected and still pass.

## 3. Architecture

### 3.1 Approach
Use the standard `@playwright/test` runner in a new `web/e2e/` folder. Playwright's `webServer`
builds the app and runs `vite preview` on `127.0.0.1:4173`. Each spec file covers one flow, and
every test runs in two Chromium projects that differ only by viewport. A small helper module holds
the shared accessible locators. The app runs entirely on `MockProvider` in the browser, so no
backend, network access or env var is needed.

### 3.2 Components and files
| File | Change |
|---|---|
| `web/package.json`, `web/package-lock.json` | devDependency `@playwright/test` pinned exactly at `1.64.1`; script `"test:e2e": "playwright test"` |
| `package.json` (root) | `"test:e2e": "npm run test:e2e --prefix web"` |
| `web/playwright.config.ts` | New: the AC2 settings (see 3.3) |
| `web/tsconfig.e2e.json` | New: mirrors `tsconfig.node.json` (`module nodenext`, `types ["node"]`, `noEmit`, the same strictness flags, `tsBuildInfoFile ./node_modules/.tmp/tsconfig.e2e.tsbuildinfo`), `include ["e2e", "playwright.config.ts"]` |
| `web/tsconfig.json` | Add `{ "path": "./tsconfig.e2e.json" }` to `references` |
| `web/vite.config.ts` | `test.exclude: [...configDefaults.exclude, 'e2e/**']` (import `configDefaults` from `vitest/config`) |
| `web/.oxlintrc.json` | Only if lint misfires (B7): an `overrides` entry for `["e2e/**", "playwright.config.ts"]` that turns off only the misfiring `vitest/*` rules. `web/src` rules are not touched |
| `web/.gitignore`, `web/.prettierignore` | Add `test-results/`, `playwright-report/`, `blob-report/`, `playwright/.cache/` |
| `web/e2e/helpers.ts` | Shared helpers: `openApp(page)` (goto `/` and wait for the "Selected players" list), `selectedList(page, kind)`, `addCard(page, singular)` (`getByRole('button', { name: /^Add player\b.*slots open/ })`), `cardRemoveButtons(list)`, `expectNoPageHScroll(page)`, `escapeRegExp`, `parseCell(text)` (returns null when the text contains "not applicable" or "—", otherwise the number with `,` `%` and other non-numeric characters stripped) |
| `web/e2e/entities.spec.ts` | AC10 |
| `web/e2e/stats.spec.ts` | AC11 |
| `web/e2e/views.spec.ts` | AC12, AC13, AC17 |
| `web/e2e/teams.spec.ts` | AC14, AC17 |
| `web/e2e/season.spec.ts` | AC15 |
| `web/e2e/kindSwitch.spec.ts` | AC16 |
| `.github/workflows/ci.yml` | New `e2e` job (AC18, AC19) |
| `docs/qa/T19-report.md` | QA report (AC20) |

### 3.3 Playwright config (AC2, AC9, AC19)
- `testDir: './e2e'`, `outputDir: 'test-results'`, `fullyParallel: true`,
  `forbidOnly: !!process.env.CI`, `retries: process.env.CI ? 1 : 0`.
- `reporter`: in CI, `[['github'], ['list'], ['html', { open: 'never' }]]`; locally, `'list'`.
- `use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' }`.
- `projects`: `mobile-375` (`devices['Desktop Chrome']` with viewport 375x667) and `desktop-1280`
  (`devices['Desktop Chrome']` with viewport 1280x800). Do not use a phone device preset, because
  it turns on `isMobile` and touch, which is out of scope.
- `webServer: { command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173
  --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI, timeout:
  180_000 }`. `npm run build` also runs `tsc -b`, so a type error in e2e fails fast.

### 3.4 Real UI vs requirement wording (locator map, read from `web/src`)
None of these needs a `web/src` change. Every locator below is accessible except the 3D point.
- Default state on a fresh page: the view is **3D** (not Table). Players is selected, with 3 players
  (`allen`, `barkley`, `chase`), season 2024, and 3 teams for Teams. Tests that need the table click
  the "Table" tab first.
- Tabs (`tablist` "View"): `Table`, `2D chart`, `3D chart`. Bars and Radar are not tabs. They are
  the `Chart type` buttons (`aria-pressed`) shown on the 2D chart tab. AC12 is read as follows: the
  Table, 2D chart and 3D chart tabs carry `aria-selected="true"` when selected, and Bars and Radar
  carry `aria-pressed="true"`.
- Views: the compare table is `table` named `/compared by stat/` inside the region "Comparison
  table". Bars is `group` "Bars chart". Radar is `group` "Radar chart" with `list` "Legend". The 3D
  chart is **`group`** "3D chart", not `region`, so AC13 targets that group. Use
  `getByRole('group', { name: '3D chart' })` so the locator does not clash with the tab of the same
  name. Hidden panels render nothing (`hidden` panel, child null), so "hides the previous one" means
  `toBeHidden()` or a count of 0.
- 3D points: `g[data-testid="point"] > circle` inside an `aria-hidden` SVG. No accessible locator
  exists, so use `getByTestId('point')` with a comment (AC8). Read the circle's `cx`/`cy`. "Reset
  view" is a button.
- Entity picker: `list` "Selected players" / "Selected teams". Card remove buttons are named
  "Remove <name>". The Add card is a button named "Add player N of 8 slots open" (the "+" is
  aria-hidden). The popover is a `dialog` named "Add player", which **sits inside the same list**
  and also contains "Add <name>" / "Remove <name>" buttons. So cards are counted only while the
  popover is closed ("Done" button), or from the remove buttons that are not inside the dialog. At 8
  selected the Add card and popover are removed entirely, so no unselected option can be reached.
  The search box is `searchbox` "Search players". The position chips are in the `group` "Filter by
  position" (`aria-pressed`), and the all chip is "All". Results are `list` "Results".
- Sidebar: `complementary` "Stats". Each group is a fieldset (`group` named by its h2). Selected
  stats are checked checkboxes named by their label. Unchecking moves the stat out of the list and
  into the group's "Add stat to <group>" menu (`group` "Stats to add to <group>", one button per
  stat). So AC11's "re-checking restores it" is done by picking the removed stat from that menu.
- Compare row header: the stat label, optionally followed by "lower is better". Match with
  `^<escaped label>\s*(lower is better)?$`.
- Nav: `group` "Players or teams" with `Players`/`Teams` buttons (`aria-pressed`). Season is
  `combobox` "Season" with options "<year> Regular Season".
- Teams: `group` "Team view" with "Compare teams"/"Team breakdown". Team chips are in the `group`
  "Teams" (badges, `aria-pressed`). The header card is the first level-2 heading in `main` (order:
  chips, header, share, roster). "Share of team production" is a heading. The unit buttons are in
  the `group` "Unit" ("Offense"/"Defense"). The roster is in the region "Roster table" with a
  `table` named "Roster". Column headers carry `aria-sort` and contain a sort button.
- Sorting: the default sort is `snap` descending. A first click on another column sets
  "descending" and a second click sets "ascending". Clicking the already-sorted column flips it
  straight to ascending. So the test picks a header whose `aria-sort` is "none". Non-numeric values
  go last in both directions.

### 3.5 Data and API changes
None. No Python change and no `web/src` change.

### 3.6 Dependencies
`@playwright/test` (dev only) is the runner named in `docs/plan.md`. It is pinned exactly with
`--save-exact` to **1.64.1**, so that version bumps, and the browser revision changes they bring,
happen only on purpose.

**Local-browser decision (B2): use the cached browser, with no download.** Playwright 1.64.1's
`browsers.json` lists `chromium` and `chromium-headless-shell` at revision **1248** (Chrome for
Testing 156.0.8078.4). This was confirmed in the playwright-core 1.64.1 used by earlier QA. Both are
already installed under `%LOCALAPPDATA%\ms-playwright\` (`chromium-1248` and
`chromium_headless_shell-1248`, each with `INSTALLATION_COMPLETE`). Local runs therefore need no
`npx playwright install`. If `npm install` resolves a different version, stop and pin back to
1.64.1. Only if that is impossible, run `npx playwright install chromium` once and record it in the
QA report. No system Chrome `channel` is used. CI always runs
`npx playwright install --with-deps chromium`.

## 4. Design (test behaviour; no UI changes)

- User flows are the AC10-AC16 scripts, as described in the task list. Each test does
  `openApp(page)` on a fresh page. Tests share no state, and the order of steps inside a test is the
  user's order.
- Loading state: `MockProvider` resolves asynchronously, so every first assertion is a web-first
  `expect(locator)` that auto-waits (for example, the "Selected players" list having 3 remove
  buttons). Values that change after an action use `expect.poll` or `toHaveText`/`not.toHaveText`.
  There are no sleeps.
- Empty and error states: not exercised in e2e (Vitest covers them). The popover's "No matches."
  state is not needed.
- Success state: each AC's end assertions.
- Mobile (375x667) and desktop (1280x800): the same test code runs in both projects. At 375 the
  sidebar sits above the panel, and the compare/roster tables scroll inside their regions.
  Playwright scrolls targets into view before clicking. Before the 3D drag the test calls
  `scrollIntoViewIfNeeded()` on the chart and uses its bounding box. `expectNoPageHScroll` (AC17)
  runs at the end of the views and teams tests. It is asserted in both projects, which is stricter
  than AC17 and is expected to hold, because T18 verified it at both widths.
- Accessibility: all locators are role, label or text based, so the suite also checks that the
  accessible names do not regress. The one exception is the 3D points (commented).

## 5. Risk and security

| Risk | Safeguard (task) |
|---|---|
| Flakiness from async data or popover reflow | Web-first assertions only. Add entities with `dialog.getByRole('button', { name: /^Add / }).first()` and wait for the slot text to change after each click. AC9 check `--repeat-each=3 --retries=0` (T11) |
| Name collisions ("3D chart" tab vs group, "Teams" button vs chips group, popover Remove vs card Remove, "Add player" dialog vs Add card) | Role-specific locators and anchored regexes (3.4). Count cards only with the popover closed (T4) |
| Brittle data literals | Read names, labels, chips and season options from the page. Only generic UI words are hard-coded ("All", "Offense", "Defense", "Done", "Reset view") (B8) |
| Vitest collecting `*.spec.ts` | `test.exclude` with `e2e/**`; compare the test count before and after (T3) |
| oxlint `vitest` plugin flagging Playwright `test` | Override scoped to e2e files and limited to the rules that misfire (T3) |
| Port 4173 busy locally | `--strictPort` fails loudly. `reuseExistingServer` locally reuses a running preview |
| Windows `localhost` IPv6 | `127.0.0.1` everywhere (B4) |
| Browser revision drift | Exact pin to 1.64.1 (T1) |
| AC16's empty search box is also cleared by `toggleAdd` | The position chip reset and the unfiltered result count are what distinguish the result. Also assert that no dialog is visible while on Teams and after switching back (T9) |
| CI supply chain and permissions | Use the same first-party `actions/*@v4` as the existing jobs. Give the `e2e` job only `permissions: contents: read`. Keep artifacts for 7 days. Traces hold only mock data, so no secrets or env vars are involved |
| Leftover failing test from AC20(c) | Create the temporary spec, run it, check for `trace.zip`, then delete it. Before the commit, confirm with `git status` that it is gone (T11) |

Input validation and auth: not applicable. There is no user input to the system beyond the UI
itself, and no auth exists.

## 6. Gaps check

- Auth: none in the app. CI uses no secrets.
- Validation: not applicable. Test inputs come from the page.
- Error handling: webServer start failures and timeouts fail the run. Traces are kept on failure.
- Mobile: the 375 project, plus the no-horizontal-scroll assertion.
- Accessibility: role-based locators. Axe is out of scope.
- Config and env vars: only `CI` (set by GitHub) is read. `.env` is not used or touched.
- Tests: the Vitest boundary is kept (AC4), and all existing checks are re-run (AC21, AC22).

## 7. Tasks (one commit each)

- **T1 Add Playwright dependency** (AC1). In `web/`: `npm install -D --save-exact
  @playwright/test@1.64.1`. Check that `node_modules/playwright-core/browsers.json` lists chromium
  revision 1248, and that `package.json` has no new `dependencies` and no `playwright-core` entry.
  Commit `web/package.json` and `web/package-lock.json`.
- **T2 Playwright config, scripts and ignores** (AC2, AC3, AC6). Add `web/playwright.config.ts` as
  in 3.3. Add the `test:e2e` scripts in `web/package.json` and the root `package.json`. Add the
  ignore entries to `web/.gitignore` and `web/.prettierignore`.
- **T3 Type-check, lint and Vitest boundary** (AC4, AC5). Add `web/tsconfig.e2e.json` and its
  reference in `web/tsconfig.json`. Add `test.exclude` in `web/vite.config.ts`. Record the
  `npm test` count before and after (it must be equal). Run lint, and add the scoped oxlint
  override only if needed. Run `npm run typecheck`, `npm run format:check` and `npm run build`.
- **T4 Helpers and the entities spec** (AC7, AC8, AC10). `web/e2e/helpers.ts` and
  `web/e2e/entities.spec.ts`, test "adding players stops at 8 and removing one reopens a slot".
  Steps:
  1. Assert 3 cards.
  2. Open the Add card and click the first `/^Add /` result 5 times, asserting the slot text each
     time. At 8 the dialog closes.
  3. Assert 8 card remove buttons, no Add card (count 0) and no dialog.
  4. Remove the first card by its "Remove <name>" button: 7 cards, and the Add card shows
     "1 of 8 slots open".
  
  Second test: "removing a player from inside the add popover frees a slot". Open the popover,
  click a `/^Remove /` button inside the dialog, then assert the Add card says "6 of 8 slots open".
  Close with Done and assert 2 cards. First run of `npm run test:e2e`.
- **T5 Stats spec** (AC11). `web/e2e/stats.spec.ts`, test "unchecking a stat removes its table row
  and adding it back restores it". Steps:
  1. Click the Table tab.
  2. In "Stats", take the first checked checkbox's name and the group containing it.
  3. Uncheck it: the row header is gone and the checkbox is gone.
  4. Click "Add stat to <group>" and pick that label in "Stats to add to <group>": the row is back
     and the checkbox is checked again.
  
  Second test: "adding a stat from the Add stat menu adds a table row". Open a group's menu, read
  the first button's label, pick it, then assert the row and the checked checkbox.
- **T6 Views spec: tabs and 3D drag** (AC12, AC13, AC17). `web/e2e/views.spec.ts`.
  - Test "each view tab shows its chart and hides the previous one". Start on 3D (the group is
    visible and `aria-selected` is true). Then:
    - Table: the table is visible, the 3D group is hidden, and the tab is selected.
    - 2D chart: the Bars chart is visible and the table is hidden. Each bar group's list has one
      item per selected card, and the shortNames read from the table column headers appear in the
      bars.
    - Radar (pressed): the Radar chart is visible, the Bars chart is hidden, and the Legend has 3
      items.
    - 3D chart: the group is visible and the Radar chart is hidden.
    - Finally, `expectNoPageHScroll`.
  - Test "dragging the 3D chart rotates the points and Reset view restores them". Steps:
    1. Read the first point circle's `cx`/`cy`.
    2. Drag with `page.mouse`: down at the group centre, move +120,+40 in 10 steps, then up.
    3. `expect.poll` until the coordinates differ.
    4. Click "Reset view" and `expect.poll` until they equal the originals.
- **T7 Teams spec** (AC14, AC17). `web/e2e/teams.spec.ts`.
  - Test "team breakdown shows chips, header, share and roster, and switching team updates the
    header". Click Teams, then Team breakdown. Assert the chips group, the first h2 (header), the
    "Share of team production" heading and the "Roster table" region. Click the first chip that is
    not pressed: it becomes pressed and the header text changes. Finally, `expectNoPageHScroll`.
  - Test "switching Offense and Defense changes the roster columns". Compare the column header
    names before and after, and check that Defense becomes pressed.
  - Test "clicking a roster column sorts descending then ascending with blanks last". Pick a header
    with `aria-sort="none"`. Click its button: `aria-sort` becomes "descending" and the parsed values
    of that column are non-increasing, with nulls only at the end. Click again: "ascending",
    non-decreasing, nulls last. Read the column index from the header position, and read cells per
    `row` in the "Roster" table.
- **T8 Season spec** (AC15). `web/e2e/season.spec.ts`, test "changing the season updates the table
  values and switching back restores them". Steps:
  1. Click the Table tab and capture the table's `cell` texts.
  2. Read the Season options and select the non-current one: `toHaveValue` is the new year and the
     cell texts differ (`expect.poll`).
  3. Select the original season: the value is restored and the cell texts are equal again.
- **T9 Kind switch spec** (AC16). `web/e2e/kindSwitch.spec.ts`, test "switching to Teams and back
  clears the player search and position filter". Steps:
  1. Open the Add card and record the unfiltered `Results` item count.
  2. Click the first chip that is not "All" (it becomes pressed), then type the first 2 letters of
     the first result name into the "Search players" box. The count must drop below the unfiltered
     count (to make that true, the position is chosen first and then the query).
  3. Click Teams: no dialog, and the "Selected teams" list is shown. Click Players: no dialog.
  4. Open the Add card: the search box is empty, "All" is pressed, and the count equals the
     unfiltered count.
- **T10 CI job** (AC18, AC19). In `.github/workflows/ci.yml`, add the `e2e` job after `web`:
  - Settings: `runs-on: ubuntu-latest`, `permissions: contents: read`,
    `defaults.run.working-directory: web`, `timeout-minutes: 20`.
  - Steps:
    1. checkout@v4
    2. setup-node@v4 (`lts/*`, npm cache, `web/package-lock.json`)
    3. `npm ci`
    4. `npx playwright install --with-deps chromium`
    5. `npm run test:e2e`
    6. `actions/upload-artifact@v4` with `if: ${{ failure() }}`, name `playwright-traces`, `path:`
       `web/test-results/` and `web/playwright-report/`, `retention-days: 7`,
       `if-no-files-found: ignore`.
  
  The `test` and `web` jobs and the triggers stay unchanged.
- **T11 Local validation** (AC9, AC20 a-c, AC21, AC22). In `web/`:
  1. Run `npm ci` and `npm run test:e2e` (all pass, both projects).
  2. Run `npx playwright test --repeat-each=3 --retries=0` (0 failed, 0 flaky).
  3. Grep `web/e2e` for `waitForTimeout|setTimeout|sleep` and expect no matches.
  4. Create a temporary failing spec, run it, and confirm there is a `trace.zip` under
     `test-results/`. Delete the spec and confirm with `git status`.
  5. Parse `ci.yml` with a YAML parser (PyYAML or `yaml` in the scratchpad), and run `actionlint`
     if it is available.
  6. Run lint, format:check, typecheck, `npm test` (record the count) and build. At the repo root,
     run `ruff check .` and `pytest`.
  7. Run `git status` and confirm there are no output files.
  
  This task only commits fixes, if any are needed.
- **T12 QA report** (AC20). Write `docs/qa/T19-report.md`. It records:
  - the commands and results of T11;
  - the test list per project;
  - the repeat-each numbers;
  - the trace proof;
  - the YAML check;
  - the B2 browser decision (cached Chromium 1248 via 1.64.1, no download);
  - any oxlint override that was added;
  - the AC12 and AC13 readings from 3.4.

## 8. Open questions for the human (none blocking)

1. Should `CLAUDE.md` "Web commands" list `npm run test:e2e`, and the one-time
   `npx playwright install chromium` for machines without the cached browser? Agents may not edit
   `CLAUDE.md`.
2. Should CI also run on pushes to `autobuild`, so unattended runs get CI feedback? The current
   triggers are kept.
3. Should Firefox/WebKit or a 768px project be added later, or should e2e stay Chromium-only at two
   widths?
4. Should the AC12 wording be updated to the real UI (tabs "Table / 2D chart / 3D chart" with a
   Bars/Radar chart-type switch, and the 3D chart as a `group`, not a `region`)? This plan already
   reads it that way.
