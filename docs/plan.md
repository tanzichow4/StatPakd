# StatPakd: implementation plan

Source of truth for the design: `design_handoff_statpakd/README.md` and `design_handoff_statpakd/design/StatPakd App.dc.html` (the script block at the bottom has the exact data shapes, formatting, normalization and 3D math).

## Goal
A web app to pick up to 8 players or teams, choose stats, and compare them as a Table, 2D chart (bars or radar) or interactive 3D scatter, plus a Team breakdown view. Launch league is NFL; the architecture must stay league-agnostic.

## Decisions made
| Decision | Choice |
|---|---|
| Frontend | React + TypeScript + Vite in `web/` |
| Styling | CSS modules + CSS variables for design tokens (no Tailwind) |
| 3D | Keep the design's lightweight SVG projection; no three.js |
| 2D charts | Hand-rolled SVG/HTML, as in the design (no chart library) |
| State | One reducer + React context, pure logic tested separately |
| Data (phase 1) | Mock NFL data ported from the design, behind a `DataProvider` interface |
| Backend | Python (FastAPI) in `src/statpakd`, later phase, after a provider spike |
| Real data source | nflverse via `nflreadpy` (owner, 2026-11-24): [decision](decisions/data-provider.md) |
| Tests | Vitest + Testing Library (unit/component), Playwright (e2e) |

## Principles
- Pure logic (formatting, best-of, normalization, 3D math, reducer) lives outside components and is unit tested first.
- No NFL field names in components. Stat definitions and entities come from the data layer.
- Every view has loading, empty and error states. Keyboard reachable, labelled controls.
- The mock provider and the future API provider return the same types, so the UI never changes when data goes real.

## Phases and tickets
| Phase | Ticket | Title | Size | Depends on |
|---|---|---|---|---|
| 0 Foundation | [T01](tickets/T01-scaffold-web-app.md) | Scaffold web app, tooling, CI | M | none |
| | [T02](tickets/T02-design-tokens-and-primitives.md) | Design tokens and UI primitives | M | T01 |
| 1 Data and logic | [T03](tickets/T03-domain-types-and-provider-interface.md) | Domain types and provider interface | S | T01 |
| | [T04](tickets/T04-mock-nfl-data.md) | Mock NFL data and provider | M | T03 |
| | [T05](tickets/T05-stat-utilities.md) | Stat utilities (format, best, normalize) | M | T03 |
| | [T06](tickets/T06-app-state.md) | App state reducer and context | M | T03 |
| 2 Compare view | [T07](tickets/T07-global-nav.md) | Global nav | S | T02, T06 |
| | [T08](tickets/T08-entity-picker.md) | Entity cards and add popover | M | T02, T04, T06 |
| | [T09](tickets/T09-stat-sidebar.md) | Stat sidebar and Add stat menu | M | T02, T04, T06 |
| | [T10](tickets/T10-compare-panel-and-table.md) | Compare panel, tabs and Table view | M | T05, T08, T09 |
| | [T11](tickets/T11-bars-chart.md) | 2D Bars chart | S | T10 |
| | [T12](tickets/T12-radar-chart.md) | 2D Radar chart | M | T10 |
| | [T13](tickets/T13-3d-math.md) | 3D projection math | S | T03 |
| | [T14](tickets/T14-3d-chart.md) | 3D chart, axes and readout | L | T10, T13 |
| 3 Team breakdown | [T15](tickets/T15-team-breakdown-header.md) | Teams mode switch, chips, header card | M | T04, T07 |
| | [T16](tickets/T16-share-of-production.md) | Share of production stacked bars | M | T15 |
| | [T17](tickets/T17-roster-table.md) | Sortable roster table | M | T15 |
| 4 Quality | [T18](tickets/T18-responsive-and-a11y.md) | Responsive and accessibility pass | M | T10 to T17 |
| | [T19](tickets/T19-e2e-tests.md) | Playwright e2e tests in CI | M | T10 to T17 |
| | [T20](tickets/T20-visual-fidelity-pass.md) | Visual fidelity pass against design | M | T10 to T17 |
| | [T25](tickets/T25-player-weeks-dot-plot-3d.md) | Week to week view, dot graph, readable 3D | L | T10 to T14 |
| 5 Real data (later) | [T21](tickets/T21-spike-data-provider.md) | Spike: choose a stats data provider | S | none |
| | [T22](tickets/T22-python-api.md) | Python API serving the data contract | L | T21, T03 |
| | [T23](tickets/T23-api-provider-in-frontend.md) | Frontend API provider, loading and errors | M | T22 |
| | [T24](tickets/T24-license-and-hosting.md) | License and hosting decision | S | none |

## Suggested order and parallelism
1. T01, then T02 and T03 in parallel.
2. T04, T05, T06 and T13 in parallel (all pure logic, independent files).
3. T07, T08, T09, then T10, then T11, T12, T14.
4. T15 to T17 can start once T04 and T07 are done, in parallel with T11 to T14.
5. T18 to T20 after all views exist. T21 and T24 can run any time.

Each ticket is small enough for one commit or PR. A ticket is done when its acceptance criteria hold, lint, type check and tests pass, and CI is green.

## Risks
- **Data licensing and cost** (T21): real NFL stats are often paid or restricted. This blocks T22 and T23 only, not the UI.
- **3D interaction** (T14): painter sorting and drag handling are the most error prone part. T13 isolates the math so it can be tested without a browser.
- **Fidelity drift**: the design is high fidelity. T20 is a dedicated pass, and tokens in T02 should prevent most drift.
- **The mock data is deterministic fake data** (hash-based variation). It is now used only by tests and `VITE_DATA_SOURCE=mock`, where it stays labelled.

## Open questions
1. License and distribution (T24): private, open-source repo, or hosted site? Not blocking until publish.
2. Should the design handoff folder be committed to the repo (recommended) so tickets can link to it?
3. Are non-NFL leagues in scope for the first release, or only shown as "Soon" tabs (the design's behaviour)?
