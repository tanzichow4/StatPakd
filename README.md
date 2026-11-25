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
python -m statpakd     start the data API on http://127.0.0.1:8000
```

## Running StatPakd

The web app needs the data API. Use two terminals:

```
python -m statpakd     terminal 1 (venv activated): the API
npm run dev            terminal 2: the web app, at the address it prints
```

After pulling changes, run `pip install -e ".[dev]"` again and restart both.

To run the web app on its built-in sample data, without the API:

```
$env:VITE_DATA_SOURCE='mock'; npm run dev     # Windows (PowerShell)
VITE_DATA_SOURCE=mock npm run dev             # macOS / Linux
```

## Data

Real data comes from [nflverse](https://github.com/nflverse) through
[`nflreadpy`](https://pypi.org/project/nflreadpy/): seasons from 2022, playoffs included. The API
downloads tables when they are first needed, saves them on disk, and downloads them again once they
are older than a day. If that fails it keeps using the saved copy. Interactive API documentation is
at http://127.0.0.1:8000/docs.

The data belongs to its owners. Check their terms before showing it on a public site
(see `docs/decisions/data-provider.md`).

### Settings

All are optional. Put them in `.env` or the environment.

| Variable | Default | Meaning |
|---|---|---|
| `STATPAKD_HOST` | `127.0.0.1` | Address the API listens on |
| `STATPAKD_PORT` | `8000` | Port the API listens on |
| `STATPAKD_CACHE_DIR` | your user cache folder | Where downloaded tables are saved |
| `STATPAKD_CACHE_HOURS` | `24` | Age at which data is downloaded again |
| `STATPAKD_FIRST_SEASON` | `2022` | Oldest season offered |
| `STATPAKD_CORS_ORIGINS` | the local dev server | Comma-separated web addresses allowed to call the API |

The web app reads these when it is started or built: `STATPAKD_API` (where the dev and preview
servers forward `/api`, default `http://127.0.0.1:8000`), `VITE_API_URL` (call the API at this
address instead) and `VITE_DATA_SOURCE` (`mock` for sample data).

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
