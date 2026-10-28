# T23: Frontend API provider, loading and errors
**Phase:** 5 · **Size:** M · **Depends on:** T22

## Scope
`ApiProvider` implementing `DataProvider` against the T22 endpoints; provider chosen by env var (`VITE_DATA_SOURCE=mock|api`). Add loading skeletons, empty and error states with retry to every view, request caching per league, kind and season, and remove the sample-data label when the API is used.

## Acceptance criteria
- [ ] The UI works unchanged against either provider.
- [ ] Network failure shows an error with a retry button, not a blank page.
- [ ] Tests cover loading, success and failure with a mocked fetch.
