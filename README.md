# StatPakd

A way to view and analyze sports statistics.

## Getting started

Requires Python 3.10+.

```bash
python -m venv .venv
source .venv/bin/activate        # macOS / Linux
.\.venv\Scripts\Activate.ps1     # Windows (PowerShell)
pip install -e ".[dev]"
cp .env.example .env             # Windows: copy .env.example .env
pre-commit install
```

## Everyday commands (with the venv activated)

```
pytest                 run tests
pytest --cov=statpakd  run tests with coverage
ruff check .           lint
ruff format .          format
python -m statpakd     run the app
```

## Web app

The frontend lives in `web/` (React + TypeScript + Vite). Requires Node 20+.
The same scripts also work from the repo root (`npm run dev`, `npm test`, ...), where they forward to `web/`; run `npm run install:web` once first.

```
cd web
npm install
npm run dev          dev server
npm test             unit tests (Vitest)
npm run lint         lint (oxlint)
npm run typecheck    type check
npm run format       format (Prettier)
npm run build        production build
```

## Layout

```
src/statpakd/   Python package
tests/          pytest tests
web/            React frontend
docs/           plan and tickets
.github/        CI (Python: ruff + pytest, web: lint, types, tests, build)
```
