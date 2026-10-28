# StatPakd

A way to view and analyze sports statistics. Python 3.10+, src layout, package `statpakd`.

## Commands (venv activated: `.venv\Scripts\Activate.ps1` on Windows)
- Install: `pip install -e ".[dev]"`
- Tests: `pytest`
- Lint: `ruff check .`
- Format: `ruff format .`
- Run: `python -m statpakd`

## Layout
- Code in `src/statpakd/`, tests in `tests/`.
- Config comes from `.env` (copy `.env.example`); never edit or commit `.env`.

## Conventions
- Ruff is the linter and formatter (line length 100). Run both before committing.
- Add or update tests with every behaviour change.
- Never delete or weaken a test to make it pass.
