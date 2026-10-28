# T01: Scaffold web app, tooling, CI
**Phase:** 0 · **Size:** M · **Depends on:** none

## Goal
A runnable React + TypeScript + Vite app in `web/` with lint, format, type check, unit tests and CI.

## Scope
- Create `web/` with Vite React-TS template; strict TypeScript.
- Add ESLint, Prettier, Vitest + Testing Library + jsdom, `npm run lint | typecheck | test | format | build`.
- Load Geist and Geist Mono from Google Fonts in `index.html`.
- Add a `web` job to `.github/workflows/ci.yml` (Node LTS, `npm ci`, lint, typecheck, test, build). Keep the Python job.
- Update `.gitignore` (`node_modules/`, `web/dist/`, `coverage/`), `README.md` and `CLAUDE.md` with the web commands and layout.

## Acceptance criteria
- [ ] `npm run dev` serves a placeholder page at localhost.
- [ ] `lint`, `typecheck`, `test` (one smoke test) and `build` pass locally and in CI.
- [ ] Python CI job still passes.
- [ ] CLAUDE.md lists the exact web commands.

## Out of scope
Any real UI.
