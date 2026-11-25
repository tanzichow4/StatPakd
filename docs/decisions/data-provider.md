# Decision: stats data source

**Date:** 2026-11-24 · **Status:** chosen by the owner · **Ticket:** T21

Real NFL data will come from **nflverse**, read in Python with **`nflreadpy`**. The Python API
(T22) serves it to the web app through the `DataProvider` contract.

## Checked so far (web search only, nothing installed or run)
- The `nflreadpy` package is MIT licensed ([PyPI](https://pypi.org/project/nflreadpy/)).
- It offers `load_player_stats()` (game or season player statistics) and `load_snap_counts()`.
- The sibling R package states that the NFL data it reads belongs to its owners and is governed by
  their terms of use, and that its snap counts come from Pro Football Reference, from 2012
  ([nflreadr](https://github.com/nflverse/nflreadr/),
  [load_snap_counts](https://search.r-project.org/CRAN/refmans/nflreadr/html/load_snap_counts.html)).

## Still open
- The licence of the data itself, and terms for showing it on a public site. Settle before T24
  makes anything public.
- Mapping of source columns to `Entity`, `StatDef`, `GameLogEntry` and `RosterEntry`, including
  which values must be derived (passer rating, team snaps, bye weeks).
- How snap counts are joined to player stats (the two come from different sources).
