# T22: Python API serving the data contract
**Phase:** 5 · **Size:** L · **Depends on:** T21, T03

## Scope
FastAPI app in `src/statpakd` exposing endpoints matching the `DataProvider` methods (leagues, seasons, stat defs, entities, roster). Ingestion or caching layer per T21's decision; keys in `.env` only. Add dependencies to `pyproject.toml`, OpenAPI docs, CORS config for the web dev origin, and `python -m statpakd` starts the server.

## Acceptance criteria
- [ ] Responses validate against pydantic models mirroring the T03 types.
- [ ] pytest covers each endpoint with fixtures (no live network in tests).
- [ ] Ruff and CI pass on all supported Python versions.
- [ ] No secrets in the repo; `.env.example` documents new variables.
