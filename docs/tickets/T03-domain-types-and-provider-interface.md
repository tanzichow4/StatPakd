# T03: Domain types and provider interface
**Phase:** 1 · **Size:** S · **Depends on:** T01

## Goal
League-agnostic types and the `DataProvider` contract that both mock and real data implement.

## Scope
`web/src/domain/types.ts` and `provider.ts`:
- `League`, `StatDef` (`key, label, group, decimals?, lowerIsBetter?, signed?, extra?`), `Entity` (`id, name, shortName, meta, badge, position?, teamId?, stats: Record<string, number|null>`), `RosterEntry`, `EntityKind = 'players' | 'teams'`.
- `DataProvider`: `getLeagues()`, `getSeasons(leagueId)`, `getStatDefs(leagueId, kind)`, `getEntities(leagueId, kind, season)`, `getRoster(leagueId, teamId, unit, season)`. All async, return typed results.
- Document that `null` stat means not applicable.

## Acceptance criteria
- [ ] Types compile under strict mode; no `any`.
- [ ] No NFL-specific names appear in `domain/`.
- [ ] Short README comment on the contract (this is what T22 must serve).

## Out of scope
Implementations.
