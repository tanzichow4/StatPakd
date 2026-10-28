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

## Layout

```
src/statpakd/   application code
tests/          pytest tests
.github/        CI (ruff + pytest)
```
