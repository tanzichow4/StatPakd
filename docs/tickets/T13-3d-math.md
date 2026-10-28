# T13: 3D projection math
**Phase:** 2 · **Size:** S · **Depends on:** T03

## Goal
Pure functions for the 3D scatter so the component stays thin.

## Scope (`web/src/lib/projection.ts`)
Port from the design script: map stat values to [-1,1] using league range, rotate by yaw and pitch, perspective `f = 4.5/(4.5+z)`, scale 128, center (300,242), painter sort by depth, pitch clamp to [-0.2, 1.3], yaw += dx*0.01, pitch += dy*0.008. Helpers for the cube edges, floor and back-wall grid.

## Acceptance criteria
- [ ] Known inputs give the same screen coordinates as the design (verify at default yaw/pitch for 3 points).
- [ ] Pitch is clamped; sort order is stable and back to front.
- [ ] Null on any axis excludes the point (confirm design behaviour).
- [ ] Unit tests for all of the above.
