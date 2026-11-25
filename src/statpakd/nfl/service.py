"""Answers each data question for the NFL, keeping built seasons in memory for a while."""

import threading
import time
from collections.abc import Callable
from typing import Any

import polars as pl

from statpakd.models import (
    Entity,
    GameLogEntry,
    KindDefaults,
    RosterEntry,
    RosterUnitDef,
    StatDef,
    UiDefaults,
)
from statpakd.nfl import player_stats, team_stats
from statpakd.nfl.season import Season, load_season
from statpakd.nfl.source import Source
from statpakd.nfl.statdefs import PLAYER_STATS, ROSTER_UNITS, TEAM_STATS


class NotFound(Exception):
    """The season, team, unit or player asked for does not exist."""


class NflService:
    def __init__(self, source: Source, first_season: int = 2022, max_age: float = 86400) -> None:
        self._source = source
        self._first = first_season
        self._max_age = max_age
        self._memory: dict[tuple, tuple[float, Any]] = {}
        # Re-entrant, because building one view may need another.
        self._lock = threading.RLock()

    def _remember(self, key: tuple, build: Callable[[], Any]) -> Any:
        # One lock for everything: requests arriving together then download each table once.
        with self._lock:
            kept = self._memory.get(key)
            if kept and time.monotonic() - kept[0] < self._max_age:
                return kept[1]
            value = build()
            self._memory[key] = (time.monotonic(), value)
            return value

    def seasons(self) -> list[str]:
        """Season labels, newest first. The current season appears once it has a result."""

        def build() -> list[str]:
            current = self._source.current_season()
            years = list(range(current, self._first - 1, -1))
            if years and not any(g.played for g in self._season(current).games):
                years = years[1:]
            return [str(y) for y in years]

        return self._remember(("seasons",), build)

    def _season(self, year: int) -> Season:
        return self._remember(("season", year), lambda: load_season(self._source, year))

    def season(self, label: str, playoffs: bool = True) -> Season:
        if label not in self.seasons():
            raise NotFound(f"Unknown season: {label}")
        season = self._season(int(label))
        if playoffs:
            return season
        return self._remember(("regular", label), season.without_playoffs)

    def stat_defs(self, kind: str) -> list[StatDef]:
        return list(PLAYER_STATS if kind == "players" else TEAM_STATS)

    def roster_units(self) -> list[RosterUnitDef]:
        return list(ROSTER_UNITS)

    def entities(self, kind: str, label: str, playoffs: bool = True) -> list[Entity]:
        season = self.season(label, playoffs)
        if kind == "players":
            return self._remember(
                ("players", label, playoffs), lambda: player_stats.player_entities(season)
            )

        def build() -> list[Entity]:
            stats = self._source.team_stats(season.year)
            thirds = self._source.third_downs(season.year)
            if not playoffs:
                weeks = list(season.regular_weeks)
                stats = stats.filter(pl.col("week").is_in(weeks))
                thirds = thirds.filter(pl.col("week").is_in(weeks))
            return team_stats.team_entities(season, stats, thirds, self._source.teams())

        return self._remember(("teams", label, playoffs), build)

    def roster(
        self, team_id: str, unit: str, label: str, playoffs: bool = True
    ) -> list[RosterEntry]:
        season = self.season(label, playoffs)
        team = team_id.upper()
        if team_id != team_id.lower() or team not in season.teams:
            raise NotFound(f"Unknown team: {team_id}")
        if unit not in {u.key for u in ROSTER_UNITS}:
            raise NotFound(f"Unknown unit: {unit}")
        return self._remember(
            ("roster", label, team, unit, playoffs),
            lambda: team_stats.roster(season, team, unit),
        )

    def game_log(self, player_id: str, label: str, playoffs: bool = True) -> list[GameLogEntry]:
        """The weeks of a player. A known player with no weeks to show gets ``[]``."""
        season = self.season(label, playoffs)
        player = season.players.get(player_id)
        if player and player_stats.is_listed(player):
            return player_stats.game_log(season, player)
        # Known from this season's playoffs or from another season.
        if player_id in self.season(label).players or any(
            player_id in self._season(int(other)).players
            for other in self.seasons()
            if other != label
        ):
            return []
        raise NotFound(f"Unknown player: {player_id}")

    def ui_defaults(self) -> UiDefaults:
        """Starting choices: the latest season, its leading players and its best teams."""
        latest = self.seasons()[0]
        players = self.entities("players", latest)
        teams = sorted(
            self.entities("teams", latest),
            key=lambda t: (-(t.stats["win"] or 0), -(t.stats["pdiff"] or 0), t.id),
        )

        def leader(position: str, key: str) -> list[str]:
            best = max(
                (p for p in players if p.position == position),
                key=lambda p: p.stats.get(key) or 0,
                default=None,
            )
            return [best.id] if best else []

        return UiDefaults(
            season=latest,
            team_id=teams[0].id if teams else "",
            unit="off",
            sort_key="snap",
            players=KindDefaults(
                sel=leader("QB", "passYds") + leader("RB", "rushYds") + leader("WR", "recYds"),
                stats=["passYds", "passTd", "rushYds", "recYds", "scrim", "totTd"],
                ax=("rushYds", "recYds", "totTd"),
            ),
            teams=KindDefaults(
                sel=[t.id for t in teams[:3]],
                stats=["ppg", "ypg", "third", "papg", "to", "win"],
                ax=("ppg", "papg", "to"),
            ),
        )
