# Plan: T13 3D projection math

Source: `docs/tickets/T13-3d-math.md`, requirements `docs/plans/00-requirements.md` (the contract:
AC1 to AC25, assumptions 1 to 11). Run non-interactively: the requirements list no blocking
questions and every default under Assumptions applies.

## 1. Goal and out of scope

Goal: add a pure, unit-tested module `web/src/lib/projection.ts` that reproduces the design's SVG
3D projection exactly (stat value to cube coordinate, yaw/pitch rotation, perspective, screen
mapping, back-to-front painter sort, drag-to-camera update, and grid / cube-edge / axis line
helpers). It contains no React or DOM code; T14 consumes it to build the 3D chart.

Out of scope (from requirements): the 3D chart component, SVG markup, pointer/keyboard wiring,
Reset button, axis selects and readout (T14); screen-to-overlay percentage conversion, label
`max(10, y)` clamp, translate side and name-tag offsets (T14); "selected drawn last" ordering
(T14); any change to the reducer, `leagueRange` or `normalize`; point radius and colours; keyboard
rotation step sizes.

## 2. Acceptance criteria (copied from 00-requirements.md, same numbers)

Projection
- AC1: Projecting cube point (0, 0, 0) at any yaw/pitch returns screen (300, 242) and depth 0.
- AC2: At the default camera (yaw -0.65, pitch 0.38) projecting cube points returns exactly
  (screen coordinates rounded to 1 decimal; depth checked to 4 decimals):

  | Cube point (x, y, z) | sx    | sy    | depth   |
  |----------------------|-------|-------|---------|
  | (1, 1, 1)            | 317.8 | 203.8 | 1.6722  |
  | (1, -1, -1)          | 504.2 | 367.0 | -0.5482 |
  | (-1, -1, -1)         | 261.1 | 325.3 | -1.6722 |

- AC3: At yaw 0, pitch 0, cube point (1, 0, 0) projects to (428, 242) with depth 0, and
  (0, 1, 0) projects to (300, 114) with depth 0 (+x right, +y up).
- AC4: The camera used is whatever yaw/pitch is passed in; the default camera values come from
  `DEFAULT_YAW` / `DEFAULT_PITCH` in `appState.ts` (not duplicated literals).

Value to cube mapping
- AC5: With a pool whose stat ranges from 0 to 10, value 0 maps to -1, 5 to 0 and 10 to +1.
- AC6: A null or missing value maps to -1 on that axis (design `n01` returns 0 for null).
- AC7: When every non-null pool value is equal (min = max), any non-null value maps to 0.
- AC8: When no pool value exists for the stat (`leagueRange` returns null), a non-null value maps
  to 0 and a null value maps to -1 (via `normalize`), never NaN.
- AC9: Lower-is-better stats are NOT inverted in 3D (higher raw value is always further along +axis).
- AC10: The range used for each axis is the full league pool for the current season (all entities
  passed in), not just the selected entities.

Plotted points
- AC11: Given the pool, the three axis keys and the ordered list of selected ids, the point builder
  returns one point per entity that has non-null values on all three axes, plus every selected
  entity regardless of nulls (selected entities with a null axis are plotted at -1 on that axis).
- AC12: An unselected entity with a null or missing value on any of the three axes is excluded.
- AC13: Each point reports its entity id, selection index (position in the selected list, or -1),
  screen x/y, depth, and drop-line foot screen x/y (the projection of (x, -1, z)).
- AC14: Points are sorted back to front: descending depth (largest depth, i.e. farthest, first).
- AC15: The sort is stable: points with equal depth keep the order of the input pool.
- AC16: The builder does not mutate its inputs.

Camera drag
- AC17: A drag helper given the drag-start camera (yaw0, pitch0) and pointer delta (dx, dy) returns
  `yaw = yaw0 + dx*0.01` and `pitch = clamp(pitch0 + dy*0.008, -0.2, 1.3)`, using `PITCH_MIN` /
  `PITCH_MAX` from `appState.ts`.
- AC18: From (-0.65, 0.38): (dx 100, dy 50) -> (0.35, 0.78); dy 200 -> pitch 1.3; dy -100 ->
  pitch -0.2; yaw is never wrapped or clamped (dx 1000 -> yaw 9.35).
- AC19: The drag result is relative to the drag-start camera, not cumulative per move event.

Line helpers (each line = projected endpoints {x1, y1, x2, y2} for a given camera)
- AC20: Floor + back-wall grid returns 20 lines: for t in [-1, -0.5, 0, 0.5, 1], in this order,
  (t,-1,-1)->(t,-1,1), (-1,-1,t)->(1,-1,t), (-1,t,-1)->(-1,t,1), (-1,-1,t)->(-1,1,t).
- AC21: Cube edges returns the 12 edges of [-1,1]^3 in design order (for a in [-1,1], b in [-1,1]:
  (-1,a,b)->(1,a,b), (a,-1,b)->(a,1,b), (a,b,-1)->(a,b,1)).
- AC22: Axes returns 3 lines from (-1,-1,-1) to (1,-1,-1), (-1,1,-1) and (-1,-1,1) (X, Y, Z).
- AC23: Axis label anchors are the projections of (1.12,-1.1,-1) for X, (-1,1.08,-1) for Y and
  (-1,-1.1,1.12) for Z.
- AC24: Every line endpoint equals the point projection of its 3D endpoint at the same camera
  (e.g. at the default camera the first grid line starts at (261.1, 325.3)).

Quality
- AC25: Unit tests in `web/src/lib/projection.test.ts` cover AC1-AC24 (and AC26); `npm test`,
  `npm run lint` and `npm run typecheck` pass. The module contains no league-specific names.

Added
- AC26 (added): A selected id that is not present in the pool produces no point and no error
  (design filters `poolAll`, so unknown selected ids are silently ignored). Gap: the requirements
  did not say what happens when the selection references an entity missing from this season's pool.

## 3. Architecture

Approach: one pure TypeScript module, a line-by-line port of design script lines 349-357 and
395-409, plus a drag helper from lines 474-476. No classes, no state, no side effects.

Files
- New: `web/src/lib/projection.ts`, `web/src/lib/projection.test.ts`.
- Reused (unchanged): `web/src/lib/stats.ts` (`leagueRange`, `normalize`),
  `web/src/state/appState.ts` (`DEFAULT_YAW`, `DEFAULT_PITCH`, `PITCH_MIN`, `PITCH_MAX`),
  `web/src/domain/types.ts` (`Entity`, `EntityId`, `StatValue`).
- Import from `../state/appState` directly, not the `state/index.ts` barrel, so the pure module
  does not pull in React providers/contexts.

Public API (names indicative; final names chosen in the build, documented with TSDoc)
- Constants: `PERSPECTIVE_DISTANCE = 4.5`, `SCALE = 128`, `CENTER_X = 300`, `CENTER_Y = 242`,
  `YAW_PER_PX = 0.01`, `PITCH_PER_PX = 0.008`, `GRID_STEPS = [-1, -0.5, 0, 0.5, 1]`,
  `AXIS_LABEL_ANCHORS = { x: [1.12,-1.1,-1], y: [-1,1.08,-1], z: [-1,-1.1,1.12] }`,
  `DEFAULT_CAMERA = { yaw: DEFAULT_YAW, pitch: DEFAULT_PITCH }` (AC4).
- Types: `Camera { yaw; pitch }`, `Vec3 = readonly [number, number, number]`,
  `Projected { x; y; depth }`, `Line { x1; y1; x2; y2 }`,
  `PlotPoint { id; selIndex; x; y; depth; footX; footY }`.
- `r1(v)`: `Math.round(v * 10) / 10`.
- `project(p: Vec3, cam: Camera): Projected`: exact design formula, no pitch clamp (assumption 5).
- `toCube(value, range): number`: `2 * normalize(value, range, { lowerIsBetter: false }) - 1`
  with no `invertLowerIsBetter` option (AC9).
- `plotPoints(pool, axes: readonly [string, string, string], selectedIds, cam): PlotPoint[]`:
  computes the three `leagueRange`s once over the whole pool (not per point, unlike the design),
  filters, maps, then `.sort((a, b) => b.depth - a.depth)` on a fresh array (stable, ES2019+).
- `clampPitch(p)` and `dragCamera(start: Camera, dx, dy): Camera` (AC17-AC19).
- `line(a, b, cam)`, `gridLines(cam)` (20), `cubeEdges(cam)` (12), `axisLines(cam)` (3),
  `axisLabelAnchors(cam)` returning `{ x, y, z }` projections.

Data / API changes: none. No DataProvider, reducer or type changes. Dependencies: none new.

## 4. Design

This ticket has no UI. User flow, loading/empty/error/success states, mobile/desktop layout and
accessibility all belong to T14, which consumes this module. Relevant to T14 only: the module's
"empty" case is a well-defined result, not an error. An empty pool or a pool where every entity
has a null axis and none is selected returns `[]`; the line helpers never depend on data. Screen
coordinates are in the fixed 600 x 460 SVG viewBox space, so responsiveness is handled by SVG
scaling in T14, not here.

## 5. Risk and security

- Input validation: inputs are typed in-app data, not user text. Null and missing stat values are
  handled by `normalize` (AC6, AC8). Safeguard: tests assert no `NaN` in any output for an empty
  pool, an all-null stat and a min = max stat (T3, T4).
- Auth / data exposure: none; pure client-side math over data already on screen.
- Failure modes and safeguards:
  - Hand-computed expectations wrong: T2 runs the literal design `proj` in node before writing the
    AC2 test; if it disagrees, the design formula wins and `00-requirements.md` AC2 is corrected
    (and this plan's copy). The planner's own hand check agrees with all three rows and with the
    AC24 example, so a mismatch is unlikely.
  - Floating-point noise: `-0.65 + 1` is `0.35000000000000003`; drag tests (AC18) use
    `toBeCloseTo(v, 10)`, depth tests use `toBeCloseTo(v, 4)`, screen tests compare exact `r1`
    output with `toBe`.
  - Signed zero: depth at the origin can be `-0` for some cameras, and `toBe(0)` fails on `-0`.
    AC1 tests use `toBeCloseTo(0, 10)` for depth across several cameras (including positive and
    negative yaw/pitch); screen values are checked with `toBe`.
  - Unstable sort / input mutation: sort a newly built array only; AC16 test deep-freezes inputs
    with `deepFreeze` from `web/src/state/testUtils.ts`.
  - Duplicated constants drifting from the reducer: import camera defaults and pitch limits
    (AC4, AC17), and test that `DEFAULT_CAMERA` equals the imported values.
  - League names leaking in: the test fixtures use neutral keys (`sa`, `sb`, `sc`) and ids; T7
    greps the module.

## 6. Gaps check

- Auth: not applicable (no network, no user data).
- Validation: null / missing / all-equal / no-range covered (AC6-AC8); unknown selected ids
  covered (AC26, added).
- Error handling: module never throws on valid typed inputs and never returns NaN (T3, T4).
- Mobile and accessibility: not applicable to pure math; owned by T14.
- Config and env vars: none needed; no `.env` change.
- Tests: Vitest unit tests for every AC in `projection.test.ts`; lint, typecheck and format gate
  in T7.

## 7. Tasks

Each task is one commit, touching only `web/src/lib/projection.ts` and
`web/src/lib/projection.test.ts` unless stated. Tests are written alongside the code in the same
commit.

- T1: Scaffold the module: constants, `Camera` / `Vec3` / `Projected` / `Line` / `PlotPoint` types,
  `DEFAULT_CAMERA` from `appState.ts` imports, `r1`. Tests: `r1` rounding, `DEFAULT_CAMERA` equals
  `DEFAULT_YAW` / `DEFAULT_PITCH`. Files: `projection.ts`, `projection.test.ts`. ACs: AC4.
- T2: Verify AC2 against the design: run the literal design `proj` (script lines 349-357) with
  `node -e` at yaw -0.65, pitch 0.38 for (1,1,1), (1,-1,-1), (-1,-1,-1). If any value differs
  from the AC2 table, the design formula wins: correct the table in
  `docs/plans/00-requirements.md` and in section 2 of this plan (same commit as T3). No code
  files. ACs: AC2.
- T3: Implement `project` (yaw then pitch, perspective, `r1` screen, unrounded depth, no clamp).
  Tests: origin at several cameras (AC1), the three AC2 points, yaw 0 / pitch 0 axis directions
  (AC3), camera taken from the argument (two cameras give different results) (AC4). Files:
  `projection.ts`, `projection.test.ts` (plus requirements/plan correction if T2 found one).
  ACs: AC1, AC2, AC3, AC4.
- T4: Implement `toCube` via `leagueRange` / `normalize` without inversion. Tests: 0/5/10 on a
  0-10 pool, null and missing -> -1, min = max -> 0, `leagueRange` null -> 0 / -1 and no NaN,
  a `lowerIsBetter` stat not inverted, range taken from the full pool (an unselected entity sets
  min/max). Files: `projection.ts`, `projection.test.ts`. ACs: AC5, AC6, AC7, AC8, AC9, AC10.
- T5: Implement `plotPoints` (ranges computed once over the pool, filter, map to `PlotPoint` with
  foot = projection of (x, -1, z), stable descending-depth sort on a new array). Tests: inclusion
  of complete entities and of selected entities with nulls (null axis at -1); exclusion of
  unselected entities with a null or missing axis; fields id / selIndex / x / y / depth /
  footX / footY match `project`; descending depth; equal-depth ties keep pool order (e.g. two
  entities with identical stats); deep-frozen inputs unchanged; unknown selected id ignored;
  empty pool -> `[]`. Files: `projection.ts`, `projection.test.ts`.
  ACs: AC11, AC12, AC13, AC14, AC15, AC16, AC26.
- T6: Implement `clampPitch` and `dragCamera` (relative to drag-start camera, pitch clamped with
  `PITCH_MIN` / `PITCH_MAX`, yaw unwrapped). Tests: the four AC18 examples with `toBeCloseTo`,
  boundary values exactly -0.2 and 1.3, and two successive moves from the same start camera giving
  results that depend only on the latest delta (AC19). Files: `projection.ts`,
  `projection.test.ts`. ACs: AC17, AC18, AC19.
- T7: Implement `line`, `gridLines`, `cubeEdges`, `axisLines`, `axisLabelAnchors`. Tests: counts
  (20 / 12 / 3), exact endpoint order per AC20-AC22 by comparing each endpoint to `project` of the
  expected 3D point at the default camera and one other camera, label anchors equal `project` of
  the three anchor points, and the first grid line starting at (261.1, 325.3). Files:
  `projection.ts`, `projection.test.ts`. ACs: AC20, AC21, AC22, AC23, AC24.
- T8: Quality gate: run `npm test`, `npm run lint`, `npm run typecheck`, `npm run format` from
  `web/`; grep `projection.ts` / `projection.test.ts` for league-specific names (team, league or
  player names, `nfl`). Fix any findings without weakening tests. ACs: AC25.

## 8. Open questions

None blocking; all defaults from 00-requirements.md apply.
1. AC26 (added) assumes unknown selected ids are silently dropped, as in the design. If T14 wants
   them surfaced (for example a readout note), that is a T14 concern, not a change to this module.
2. Assumption 1 (selected entities with a null axis are still plotted at -1) follows the design
   rather than the ticket's literal "null on any axis excludes the point". Confirm at T14 review
   that the readout's "—" is enough to explain such a point.
