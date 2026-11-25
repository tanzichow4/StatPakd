# Decision: stats data source

**Date:** 2026-11-24 · **Status:** chosen by the owner · **Ticket:** T21

Real NFL data will come from **nflverse**, read in Python with **`nflreadpy`**. The Python API
(T22) serves it to the web app through the `DataProvider` contract.

## Checked by web search
- The `nflreadpy` package is MIT licensed ([PyPI](https://pypi.org/project/nflreadpy/)).
- It offers `load_player_stats()` (game or season player statistics) and `load_snap_counts()`.
- The sibling R package states that the NFL data it reads belongs to its owners and is governed by
  their terms of use, and that its snap counts come from Pro Football Reference, from 2012
  ([nflreadr](https://github.com/nflverse/nflreadr/),
  [load_snap_counts](https://search.r-project.org/CRAN/refmans/nflreadr/html/load_snap_counts.html)).

## Checked against the data (T22, 2026-11-24)
- Weekly player stats, snap counts, schedules, team stats, rosters and play-by-play cover 2022 to
  2026.
- Snap counts join to players through the Pro Football Reference id in nflverse's player table.
- The API's season totals for every listed player (counting stats, 2022 to 2026) matched nflverse's
  own regular plus playoff summaries with no differences; team points matched the schedules.

## Choices made
- Seasons from 2022; playoff games are included in all totals (owner).
- Player views list QB, RB, FB, WR and TE; defenders appear in team breakdown (owner).
- Passer rating is computed from totals with the official formula. Passing rates are shown only for
  quarterbacks and for others with at least 10 attempts.
- Team yards are net of sacks. Turnovers are interceptions plus fumbles lost.
- Roster snap % is a share of all the team's snaps that season; a player's own snap % is a share of
  the games they appeared in.

## Still open
- The licence of the data itself, and terms for showing it on a public site. Settle before T24
  makes anything public.
