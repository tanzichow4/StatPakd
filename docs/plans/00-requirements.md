# T13 requirements: 3D projection math

Source ticket: `docs/tickets/T13-3d-math.md` (its acceptance criteria are the contract).
References: design script `design_handoff_statpakd/design/StatPakd App.dc.html` line 308 (`r1` =
round to 1 decimal), 330 (default `yaw: -0.65, pitch: 0.38`), 349-357 (`proj`), 363-365 (`range`,
`n01`), 395-409 (`N`, `L`, floor/back-wall grid, cube edges, axes, label anchors, points + painter
sort), 474-476 (`resetView`, drag `pDown`/`pMove`).
Merged building blocks to reuse: `web/src/lib/stats.ts` (`leagueRange`, `normalize`),
`web/src/state/appState.ts` (`DEFAULT_YAW`, `DEFAULT_PITCH`, `PITCH_MIN`, `PITCH_MAX`, state
fields `yaw` / `pitch`, `setCamera` action, from T06).

## Goal

Provide a pure, unit-tested module `web/src/lib/projection.ts` that reproduces the design's SVG 3D
projection exactly: stat values to cube coordinates, yaw/pitch rotation, perspective, screen
mapping, painter sort, drag-to-camera update and the cube/floor/back-wall line helpers. No React or
DOM code; T14 will consume it.

## Design formulas (authoritative, from script lines 349-357 and 395)

- Cube coordinate of a value: `c = 2 * n - 1`, where `n = normalize(value, leagueRange(pool, key), def)`
  (no lower-is-better inversion in 3D). So min -> -1, max -> +1, null -> -1, equal min/max -> 0.
- Rotation for camera (yaw, pitch), applied yaw first, then pitch:
  `X = x*cos(yaw) + z*sin(yaw)`; `Z1 = -x*sin(yaw) + z*cos(yaw)`;
  `Y = y*cos(pitch) - Z1*sin(pitch)`; `Z = y*sin(pitch) + Z1*cos(pitch)`.
- Perspective `f = 4.5 / (4.5 + Z)`, scale `S = 128`, centre (300, 242).
- Screen: `sx = r1(300 + X*S*f)`, `sy = r1(242 - Y*S*f)`, depth = `Z` (unrounded).
  `r1(v) = Math.round(v * 10) / 10`.

## Acceptance criteria

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
  (0, 1, 0) projects to (300, 114) with depth 0 (sanity check of axis directions: +x right, +y up).
- AC4: The camera used is whatever yaw/pitch is passed in; the default camera values come from
  `DEFAULT_YAW` / `DEFAULT_PITCH` in `appState.ts` (not duplicated literals).

Value to cube mapping

- AC5: With a pool whose stat ranges from 0 to 10, value 0 maps to -1, 5 to 0 and 10 to +1.
- AC6: A null or missing value maps to -1 on that axis (design `n01` returns 0 for null).
- AC7: When every non-null pool value is equal (min = max), any non-null value maps to 0.
- AC8: When no pool value exists for the stat (`leagueRange` returns null), a non-null value maps to 0
  and a null value maps to -1 (via `normalize`), never NaN.
- AC9: Lower-is-better stats are NOT inverted in 3D (higher raw value is always further along +axis).
- AC10: The range used for each axis is the full league pool for the current season (all entities
  passed in), not just the selected entities.

Plotted points (design lines 405-409)

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

- AC17: A drag helper given the camera at drag start (yaw0, pitch0) and pointer delta (dx, dy) in
  pixels returns `yaw = yaw0 + dx*0.01` and `pitch = clamp(pitch0 + dy*0.008, -0.2, 1.3)`, using
  `PITCH_MIN` / `PITCH_MAX` from `appState.ts`.
- AC18: Examples: from (-0.65, 0.38) with (dx 100, dy 50) -> (0.35, 0.78); with (dy 200) -> pitch
  1.3; with (dy -100) -> pitch -0.2; yaw is never wrapped or clamped (dx 1000 -> yaw 9.35).
- AC19: The drag result is relative to the drag-start camera, not cumulative per move event.

Line helpers (each line = projected endpoints {x1, y1, x2, y2} for a given camera)

- AC20: Floor + back-wall grid returns 20 lines: for t in [-1, -0.5, 0, 0.5, 1], in this order,
  (t,-1,-1)->(t,-1,1), (-1,-1,t)->(1,-1,t), (-1,t,-1)->(-1,t,1), (-1,-1,t)->(-1,1,t).
- AC21: Cube edges returns the 12 edges of the cube [-1,1]^3, in the design order (for a in [-1,1],
  b in [-1,1]: x-edge (-1,a,b)->(1,a,b), y-edge (a,-1,b)->(a,1,b), z-edge (a,b,-1)->(a,b,1)).
- AC22: Axes returns 3 lines from (-1,-1,-1) to (1,-1,-1), (-1,1,-1) and (-1,-1,1) (X, Y, Z).
- AC23: Axis label anchors are the projections of (1.12,-1.1,-1) for X, (-1,1.08,-1) for Y and
  (-1,-1.1,1.12) for Z.
- AC24: Every line endpoint equals the point projection of its 3D endpoint at the same camera
  (e.g. at the default camera the first grid line starts at (261.1, 325.3)).

Quality

- AC25: Unit tests in `web/src/lib/projection.test.ts` cover AC1-AC24; `npm test`, `npm run lint`
  and `npm run typecheck` pass. The module contains no league-specific names.

## Out of scope

- The 3D chart component, SVG markup, pointer/keyboard event wiring, Reset button, axis selects and
  readout (T14).
- Converting screen coordinates to overlay percentages (`x/600`, `y/460`, label `max(10, y)`,
  translate side) and name-tag offsets; T14 owns layout.
- Drawing selected points above unselected ones ("selected last"); T14's AC, not part of this sort.
- Changing the reducer, `leagueRange` or `normalize` behaviour (reuse only).
- Point radius and colours (r 7 / 4.5, `#C9C9C4`, `#E0E0DC`, series colours).
- Keyboard rotation step sizes (T14).

## Assumptions

1. Null handling follows the design, not the ticket's literal wording: null on any axis excludes an
   UNSELECTED point; a SELECTED entity is still plotted, with the null axis at -1 (design line 405
   `... || selIds.includes(p.id)` and `n01(null) = 0`). The ticket asked to "confirm design
   behaviour", and this is it. T14's readout shows "—" for the value.
2. Rotation order is yaw (about the vertical y axis) then pitch (about the rotated x axis), exactly as
   `proj`. Depth is the post-rotation Z; larger Z is farther (smaller f), so back-to-front means
   descending depth, matching `sort((a, b) => b.z - a.z)`.
3. Screen coordinates are rounded with `r1` (1 decimal, `Math.round`) as in the design; depth is
   left unrounded and is used for sorting.
4. Expected values in AC2 were hand-computed from the design formulas (cos/sin to 8 digits); each is
   at least 0.009 away from a rounding boundary, so they are robust. If an implementation run of the
   literal design `proj` disagrees, the literal design formula wins and the table is corrected.
5. The pitch clamp lives in the drag helper (and already in the reducer's `setCamera`); `project`
   itself uses the pitch it is given, as the design `proj` does. Yaw is never wrapped, matching T06.
6. Range comes from `leagueRange` over the whole pool passed in (design `poolAll`), and normalization
   uses `normalize` without `invertLowerIsBetter` (design `N` uses `n01`, which never inverts).
7. When `leagueRange` is null, `normalize` returns 0.5 (cube 0) for non-null values; the design would
   produce NaN here, so this is a safe deviation that never affects the design's real data.
8. Stable sort relies on `Array.prototype.sort` being stable (ES2019+, guaranteed by the TS target);
   ties keep pool order.
9. Constants (4.5, 128, 300, 242, 0.01, 0.008, grid steps, label anchor offsets) are exported named
   constants in `projection.ts` so T14 can reuse them; camera defaults and pitch limits are imported
   from `appState.ts`.
10. Line helpers include the axes and label anchors (pure 3D math) even though the ticket only names
    cube edges, floor and back wall, because the plan puts all 3D math outside components.
11. The "back wall" is the x = -1 plane, as in the design grid (lines 3 and 4 of each grid step).

## Open questions

None blocking; all defaults recorded under Assumptions.

No blocking questions.
