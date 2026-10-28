# T19: Playwright e2e tests in CI
**Phase:** 4 · **Size:** M · **Depends on:** T10 to T17

## Scope
Playwright against the built app. Flows: add and remove entities up to 8; change stats; Table, Bars, Radar, 3D drag; Teams breakdown, sorting; season switch; Players/Teams switch resets filter. Run at 375px and 1280px. Add a CI job that installs browsers and uploads traces on failure.

## Acceptance criteria
- [ ] Tests named after behaviour and pass reliably (no fixed sleeps).
- [ ] CI job green; traces uploaded on failure.
