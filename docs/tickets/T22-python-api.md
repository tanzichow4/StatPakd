# T22: Python API serving the data contract
**Phase:** 5 · **Size:** L · **Depends on:** T21, T03

## Scope
FastAPI app in `src/statpakd` exposing endpoints matching the `DataProvider` methods (leagues, seasons, stat defs, entities, roster). Ingestion or caching layer per T21's decision; keys in `.env` only. Add dependencies to `pyproject.toml`, OpenAPI docs, CORS config for the web dev origin, and `python -m statpakd` starts the server.

## Acceptance criteria
- [x] Responses validate against pydantic models mirroring the T03 types.
- [x] pytest covers each endpoint with fixtures (no live network in tests).
- [ ] Ruff and CI pass on all supported Python versions.
- [ ] No secrets in the repo; `.env.example` documents new variables.

## Owner decision (2026-11-24)
Use nflverse through `nflreadpy`. See [the decision note](../decisions/data-provider.md), which lists
what is still open.

## Notes (2026-11-24)
- Also serves `getGameLog` and the new `getUiDefaults`.
- Open: CI has not run, and only Python 3.11 was tested locally.
- Open: `.env.example` is not updated, because the agent's permissions block reading it. The new
  variables are listed in the README.

