# StatPakd

A way to view and analyze sports statistics. Python 3.10+, src layout, package `statpakd`.

## Commands (venv activated: `.venv\Scripts\Activate.ps1` on Windows)
- Install: `pip install -e ".[dev]"`
- Tests: `pytest`
- Lint: `ruff check .`
- Format: `ruff format .`
- Run: `python -m statpakd`

## Web commands (run in `web/`, or from the repo root where the same scripts forward to `web/`)
- Install: `npm install`
- Dev server: `npm run dev`
- Tests: `npm test`
- Lint / types / format: `npm run lint` / `npm run typecheck` / `npm run format`
- Build: `npm run build`

## Layout
- Python in `src/statpakd/`, tests in `tests/`. Frontend in `web/` (React + TypeScript + Vite, CSS modules).
- Plan in `docs/plan.md`, tickets in `docs/tickets/`, design in `design_handoff_statpakd/`.
- Config comes from `.env` (copy `.env.example`); never edit or commit `.env`.

## Conventions
- Ruff is the linter and formatter (line length 100). Run both before committing.
- Add or update tests with every behaviour change.
- Frontend: no league-specific names in components; data comes through the DataProvider interface.
- Never delete or weaken a test to make it pass.
