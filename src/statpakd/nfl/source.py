"""Where the raw nflverse tables come from: downloads through nflreadpy, cached on disk."""

import logging
import os
import tempfile
import time
from collections.abc import Callable
from pathlib import Path
from typing import Protocol

import polars as pl

log = logging.getLogger(__name__)

STAT_COLUMNS = (
    "player_id",
    "player_display_name",
    "position",
    "week",
    "team",
    "attempts",
    "completions",
    "passing_yards",
    "passing_tds",
    "passing_interceptions",
    "carries",
    "rushing_yards",
    "rushing_tds",
    "receptions",
    "targets",
    "receiving_yards",
    "receiving_tds",
    "def_tackles_solo",
    "def_tackles_with_assist",
    "def_tackle_assists",
    "def_sacks",
    "def_interceptions",
    "def_pass_defended",
    "def_fumbles_forced",
    "fumble_recovery_opp",
)
SNAP_COLUMNS = (
    "week",
    "player",
    "pfr_player_id",
    "position",
    "team",
    "offense_snaps",
    "defense_snaps",
)
SCHEDULE_COLUMNS = ("week", "game_type", "home_team", "away_team", "home_score", "away_score")
TEAM_STAT_COLUMNS = (
    "week",
    "team",
    "opponent_team",
    "passing_yards",
    "sack_yards_lost",
    "rushing_yards",
    "passing_interceptions",
    "fumbles_lost_total",
)
ROSTER_COLUMNS = ("gsis_id", "full_name", "position", "team", "jersey_number")
PLAYER_COLUMNS = ("gsis_id", "pfr_id")
TEAM_COLUMNS = ("team_abbr", "team_name", "team_division")


class DataUnavailable(Exception):
    """A table could not be downloaded and there is no cached copy."""


class Source(Protocol):
    """The raw tables the NFL data is built from. Tests supply their own."""

    def current_season(self) -> int: ...
    def weekly_stats(self, season: int) -> pl.DataFrame: ...
    def snap_counts(self, season: int) -> pl.DataFrame: ...
    def schedules(self, season: int) -> pl.DataFrame: ...
    def team_stats(self, season: int) -> pl.DataFrame: ...
    def rosters(self, season: int) -> pl.DataFrame: ...
    def third_downs(self, season: int) -> pl.DataFrame: ...
    def players(self) -> pl.DataFrame: ...
    def teams(self) -> pl.DataFrame: ...


class DiskCache:
    """Parquet files that are downloaded again once they are older than ``max_age`` seconds."""

    def __init__(self, directory: Path, max_age: float) -> None:
        self.directory = directory
        self.max_age = max_age

    def get(self, name: str, download: Callable[[], pl.DataFrame]) -> pl.DataFrame:
        path = self.directory / f"{name}.parquet"
        if path.exists() and time.time() - path.stat().st_mtime < self.max_age:
            return pl.read_parquet(path)
        try:
            frame = download()
        except Exception as error:  # any download or parse failure
            if path.exists():
                log.warning("Could not refresh %s, using the saved copy: %s", name, error)
                return pl.read_parquet(path)
            raise DataUnavailable(f"Could not download {name}: {error}") from error
        self._save(path, frame)
        return frame

    def _save(self, path: Path, frame: pl.DataFrame) -> None:
        """Write to a temporary file first, so a stopped run cannot leave half a file."""
        path.parent.mkdir(parents=True, exist_ok=True)
        handle, temporary = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
        os.close(handle)
        try:
            frame.write_parquet(temporary)
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.remove(temporary)


class NflverseSource:
    """The nflverse tables through nflreadpy, keeping only the columns that are used."""

    def __init__(self, cache: DiskCache) -> None:
        import nflreadpy
        from nflreadpy.config import update_config

        # This class does its own caching, which can fall back to an older copy.
        update_config(cache_mode="off", verbose=False)
        self._nfl = nflreadpy
        self._cache = cache

    def current_season(self) -> int:
        return self._nfl.get_current_season()

    def weekly_stats(self, season: int) -> pl.DataFrame:
        return self._cache.get(
            f"stats-{season}",
            lambda: self._nfl.load_player_stats(season, summary_level="week").select(STAT_COLUMNS),
        )

    def snap_counts(self, season: int) -> pl.DataFrame:
        return self._cache.get(
            f"snaps-{season}",
            lambda: self._nfl.load_snap_counts(season).select(SNAP_COLUMNS),
        )

    def schedules(self, season: int) -> pl.DataFrame:
        return self._cache.get(
            f"schedules-{season}",
            lambda: self._nfl.load_schedules(season).select(SCHEDULE_COLUMNS),
        )

    def team_stats(self, season: int) -> pl.DataFrame:
        return self._cache.get(
            f"team-stats-{season}",
            lambda: self._nfl.load_team_stats(season, summary_level="week").select(
                TEAM_STAT_COLUMNS
            ),
        )

    def rosters(self, season: int) -> pl.DataFrame:
        return self._cache.get(
            f"rosters-{season}",
            lambda: self._nfl.load_rosters(season).select(ROSTER_COLUMNS),
        )

    def third_downs(self, season: int) -> pl.DataFrame:
        def download() -> pl.DataFrame:
            # Play-by-play is large, so only the per-game counts are kept.
            return (
                self._nfl.load_pbp(season)
                .filter(pl.col("posteam").is_not_null())
                .group_by("posteam", "week")
                .agg(
                    pl.col("third_down_converted").sum().alias("converted"),
                    pl.col("third_down_failed").sum().alias("failed"),
                )
                .rename({"posteam": "team"})
            )

        return self._cache.get(f"third-downs-{season}", download)

    def players(self) -> pl.DataFrame:
        return self._cache.get("players", lambda: self._nfl.load_players().select(PLAYER_COLUMNS))

    def teams(self) -> pl.DataFrame:
        return self._cache.get("teams", lambda: self._nfl.load_teams().select(TEAM_COLUMNS))
