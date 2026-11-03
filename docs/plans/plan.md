# T03 plan: Domain types and provider interface

Source: `docs/tickets/T03-domain-types-and-provider-interface.md`, requirements `docs/plans/00-requirements.md`.
Non-interactive run: assumptions A1 to A13 in the requirements are the contract where the ticket is silent.

## 1. Goal and out of scope

**Goal.** Define league-agnostic TypeScript domain types (`League`, `StatDef`, `Entity`, `RosterEntry`,
`EntityKind`) and the async `DataProvider` contract in `web/src/domain/`. Both the T04 mock provider and the
later API provider (T22/T23) implement this contract, so the UI never depends on where data comes from.

**Out of scope** (from requirements): any `DataProvider` implementation (T04 mock, T23 API); porting design
data, stat definitions, rosters or `vary` logic (T04); formatting/best-of/normalization utilities (T05); app
state/reducer/context (T06); a React context or hook for the provider; Python/pydantic mirrors and HTTP shapes
(T22); loading/error state types, caching, retry (T23); roster column and share definitions (T15 to T17);
changes to tsconfig, lint config or package dependencies.

## 2. Acceptance criteria

Copied from `00-requirements.md`, same numbers.

- **AC1** `web/src/domain/types.ts` and `web/src/domain/provider.ts` exist, and `npm run typecheck` passes
  under the existing strict tsconfig (`strict: true`, `erasableSyntaxOnly: true`, `verbatimModuleSyntax: true`).
- **AC2** No `any` appears in `web/src/domain/` (neither explicit `any` nor `as any`); searching the folder for
  the word `any` as a type finds nothing.
- **AC3** No NFL-specific names appear anywhere in `web/src/domain/` (identifiers, string literals or comments).
  A case-insensitive search of the folder for at least these terms returns no matches: `NFL`, `quarterback`,
  `touchdown`, `passYds`, `rushYds`, `recYds`, `QB`, `RB`, `WR` (as whole words), `TE` (as a whole word),
  `Chiefs`, `Eagles`, `AFC`, `NFC`, `snap`, `sack`.
- **AC4** `provider.ts` carries a short documentation comment (TSDoc block) that describes the contract as
  "what T22 must serve": each method, its arguments, its return shape, and that all methods are async.
- **AC5** `EntityKind` is exported and accepts exactly `'players'` and `'teams'`; assigning any other string
  is a type error.
- **AC6** `StatDef` is exported with required `key`, `label`, `group` (all strings) and optional
  `decimals` (number), `lowerIsBetter` (boolean), `signed` (boolean), `extra` (boolean). An object with only
  the three required fields type-checks; omitting any required field is a type error.
- **AC7** `Entity` is exported with required `id`, `name`, `shortName`, `meta`, `badge` (strings),
  optional `position` and `teamId` (strings), and `stats: Record<string, number | null>`. A stat value of
  `null` type-checks; a string or `undefined` stat value is a type error.
- **AC8** `League` and `RosterEntry` are exported types (fields per Assumptions A2 and A4).
- **AC9** `DataProvider` is exported with exactly these five methods, each returning a `Promise` of a typed
  result: `getLeagues(): Promise<League[]>`, `getSeasons(leagueId): Promise<string[]>`,
  `getStatDefs(leagueId, kind: EntityKind): Promise<StatDef[]>`,
  `getEntities(leagueId, kind: EntityKind, season): Promise<Entity[]>`,
  `getRoster(leagueId, teamId, unit, season): Promise<RosterEntry[]>`.
  A synchronous implementation (returning plain values) is a type error.
- **AC10** The docs state, on the `stats` field (of both `Entity` and `RosterEntry`) and in the contract
  comment, that a `null` stat means "not applicable" (distinct from zero), and that a missing key means the
  stat is not provided.
- **AC11** A Vitest test file under `web/src/domain/` exercises the types at compile level: it builds a
  minimal in-test object satisfying `DataProvider` with neutral, made-up data (no league-specific names) and
  asserts each method resolves to the expected shape. It also includes `@ts-expect-error` checks for at least
  AC5 (invalid kind), AC7 (non-number stat) and AC9 (sync return). `npm test`, `npm run lint`,
  `npm run typecheck` and `npm run format:check` all pass.
- **AC12** No existing test is removed or weakened; no files outside `web/src/domain/` change, other than
  optionally `docs/progress.md`.

No ACs added. One clarification folded into the tasks rather than a new AC: `@ts-expect-error` lines are only
enforced by `tsc` (Vitest strips types), so AC11's compile checks rely on `npm run typecheck`, which already
covers `src/**` including test files via `tsconfig.app.json`.

## 3. Architecture

**Approach.** Types-only module, zero runtime code (beyond the test). Unions and type aliases only, no `enum`
(A12, `erasableSyntaxOnly`). Use `interface` or `type` consistently; plan uses `interface` for object shapes
and `type` for aliases and unions.

**Files (all new, all in `web/src/domain/`):**

| File | Contents |
|---|---|
| `types.ts` | `LeagueId`, `TeamId`, `EntityId`, `Season`, `RosterUnit` aliases (all `string`, A1, A5); `StatValue = number \| null`; `StatMap = Record<string, StatValue>`; `EntityKind = 'players' \| 'teams'`; interfaces `League { id; name; enabled }` (A2), `StatDef` (AC6), `Entity` (AC7, A6, A7), `RosterEntry { id; name; position; number?; stats }` (A4). TSDoc on `stats` fields per AC10. |
| `provider.ts` | `import type { ... } from './types'`; file-level TSDoc "contract T22 must serve" (AC4, AC10, A3 ordering, A5 opaque unit, A13 rejected promise on failure); `export interface DataProvider` with five methods and per-method TSDoc. |
| `domain.test.ts` | In-test stub provider with neutral data, runtime shape assertions, and `@ts-expect-error` checks (AC11). |
| `index.ts` (optional) | `export type * from './types'` and `export type { DataProvider } from './provider'`. Skip unless the implementer wants a single import path; not required by any AC. |

**Data/API changes.** None at runtime. This defines the shape T22's Python API must serve later.

**Dependencies.** None added (out of scope to change packages).

**Constraints from existing config** (`web/tsconfig.app.json`):
- `verbatimModuleSyntax`: type imports must use `import type`.
- `noUnusedParameters` / `noUnusedLocals`: stub methods in the test must use their params or prefix with `_`;
  `@ts-expect-error` fixtures must be consumed (e.g. `void x`) or declared in a way that is not "unused".
- Test globals are enabled (`vitest/globals`), but explicit `import { describe, it, expect } from 'vitest'`
  is fine and clearer.

## 4. Design

No UI in this ticket. The "user" is a developer implementing or consuming the contract.

- **Flow.** T04/T23 write `class X implements DataProvider` or `const p: DataProvider = {...}`; components
  (later tickets) call `await provider.getEntities(league, kind, season)`.
- **States.** Loading, empty, error and success are not modelled here (T23). The contract only fixes:
  success = resolved typed value; empty = resolved empty array (document this); error = rejected promise (A13).
- **Mobile/desktop, accessibility.** Not applicable (no rendered output). `meta`/`badge` are preformatted
  strings so later components need no parsing logic.

## 5. Risk and security

| Risk | Safeguard (task) |
|---|---|
| League-specific terms leak into comments/examples (AC3), including substrings like "snapshot" matching `snap`. | Use neutral placeholders only ("league-a", "team-1", "points"); avoid words containing `snap`/`sack`. Grep check in T4. |
| The word "any" used in prose ("any string") trips AC2's grep. | Avoid the word "any" in domain comments; phrase as "every", "arbitrary", "a string". Grep check in T4. |
| `@ts-expect-error` silently stops meaning anything if the line is valid. | That is exactly what tsc reports (unused directive is an error); rely on `npm run typecheck` in T4. |
| Stats contract ambiguity (null vs 0 vs missing) causes wrong best-of logic later. | Explicit TSDoc per AC10 in T1 and T2. |
| Untrusted data at runtime (future API) does not match types. | Out of scope; note in contract comment that runtime validation is the API provider's job (T23). |
| Auth / data exposure. | None: no network, no secrets, no env vars. |

## 6. Gaps check

- Auth: not applicable (no I/O). 
- Validation: compile-time only; runtime validation deferred to T23 and noted in docs.
- Error handling: rejected promises (A13), documented in contract.
- Mobile / accessibility: no UI.
- Config and env vars: none added; tsconfig/lint untouched (AC12).
- Tests: compile-level plus runtime shape test (AC11).

## 7. Tasks

- **T1 Types.** Create `web/src/domain/types.ts` with aliases, `StatValue`, `StatMap`, `EntityKind`, `League`,
  `StatDef`, `Entity`, `RosterEntry`, and TSDoc on every type and on both `stats` fields (null = not
  applicable, distinct from zero; missing key = not provided). Run `npm run typecheck`.
  ACs: AC1, AC2, AC3, AC5, AC6, AC7, AC8, AC10.
- **T2 Provider contract.** Create `web/src/domain/provider.ts`: file-level TSDoc stating this is what T22
  must serve, that all five methods are async and reject on failure, seasons are newest first, empty results
  are empty arrays, `unit` is an opaque data-defined string, plus the null-stat rule; `DataProvider`
  interface with the five methods and per-method TSDoc (args, return shape). Run `npm run typecheck`.
  ACs: AC1, AC2, AC3, AC4, AC9, AC10.
- **T3 Test.** Create `web/src/domain/domain.test.ts`: neutral stub `DataProvider` (e.g. league `league-a`,
  seasons `['2002','2001']`, stat key `points`, team `team-1`); one `it` per method asserting resolved shape
  (including a `null` stat value and a `StatDef` with only required fields); `@ts-expect-error` cases for
  invalid `EntityKind` (AC5), string and `undefined` stat values (AC7), missing required `StatDef` field (AC6),
  and a provider whose `getLeagues` returns a plain array (AC9). Keep params used or `_`-prefixed.
  ACs: AC5, AC6, AC7, AC9, AC11.
- **T4 Verify.** Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run format` then
  `npm run format:check`; grep `web/src/domain/` case-insensitively for `\bany\b` and every AC3 term
  (whole-word for QB/RB/WR/TE); confirm `git status` shows changes only in `web/src/domain/` (and optionally
  `docs/progress.md`). Fix and fold into the relevant commit. ACs: AC2, AC3, AC11, AC12.

## 8. Open questions

None block T03; defaults in requirements A1 to A13 apply.

1. Roster `unit`: opaque string (A5, chosen) or fixed `'off' | 'def'` union? If opaque, where do unit labels
   come from (new provider method or league metadata)? Blocks T15.
2. Should roster column/share definitions be served via `DataProvider` (e.g. a roster stat-defs method)?
   Matters for T16/T17 and T22.
3. Is `RosterEntry` (A4) right, especially the added `id` and optional `number`?
4. Should `League` carry more than `id`, `name`, `enabled` (e.g. sort order, separate "coming soon" flag)?
