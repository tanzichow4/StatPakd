"""A tiny invented league, so that no test needs the network.

Season 2026: weeks 1 and 2 are regular season, week 3 is not played yet and week 19 is a playoff.
Season 2025 has one finished week. CCC has no game in week 2 (a bye).
"""

from pathlib import Path

import polars as pl
import pytest

from statpakd.config import Settings
from statpakd.nfl.service import NflService
from statpakd.nfl.source import (
    PLAYER_COLUMNS,
    ROSTER_COLUMNS,
    SCHEDULE_COLUMNS,
    SNAP_COLUMNS,
    STAT_COLUMNS,
    TEAM_COLUMNS,
    TEAM_STAT_COLUMNS,
)

NUMERIC_STATS = STAT_COLUMNS[5:]


def frame(columns, rows: list[dict]) -> pl.DataFrame:
    """Rows as a table with every column, using None where a row does not give a value."""
    data = {c: [row.get(c) for row in rows] for c in columns}
    return pl.DataFrame(data, strict=False)


def stat(player: str, name: str, position: str, week: int, team: str, **values) -> dict:
    row = {
        "player_id": player,
        "player_display_name": name,
        "position": position,
        "week": week,
        "team": team,
    }
    return {**row, **dict.fromkeys(NUMERIC_STATS, 0), **values}


def snap(player: str, name: str, position: str, week: int, team: str, off=0, dfn=0) -> dict:
    return {
        "week": week,
        "player": name,
        "pfr_player_id": f"pfr-{player}",
        "position": position,
        "team": team,
        "offense_snaps": float(off),
        "defense_snaps": float(dfn),
    }


QB = ("qb1", "Quin Backer", "QB")
RB = ("rb1", "Rory Bell", "RB")
WR = ("wr1", "Wes Ray-Lee", "WR")
LB = ("lb1", "Lou Barker", "LB")
OL = ("ol1", "Olly Lineman", "T")

STATS_2026 = [
    stat(*QB, 1, "AAA", attempts=40, completions=30, passing_yards=300, passing_tds=3),
    stat(*QB, 19, "AAA", attempts=20, completions=10, passing_yards=100, passing_interceptions=2),
    stat(*RB, 1, "AAA", carries=20, rushing_yards=100, rushing_tds=1, targets=3, receptions=2,
         receiving_yards=15),
    stat(*RB, 2, "AAA", carries=15, rushing_yards=45),
    stat(*WR, 1, "BBB", targets=10, receptions=8, receiving_yards=120, receiving_tds=1),
    stat(*LB, 1, "BBB", def_tackles_solo=5, def_tackles_with_assist=1, def_tackle_assists=3,
         def_sacks=1.5, def_interceptions=1, def_pass_defended=2, def_fumbles_forced=1,
         fumble_recovery_opp=1),
]  # fmt: skip

SNAPS_2026 = [
    snap(*OL, 1, "AAA", off=60),
    snap(*QB, 1, "AAA", off=60),
    snap(*RB, 1, "AAA", off=45),
    snap(*OL, 1, "BBB", off=70),
    snap(*WR, 1, "BBB", off=63),
    snap(*LB, 1, "BBB", dfn=60),
    snap("ol2", "Dee Fender", "DE", 1, "BBB", dfn=60),
    snap(*OL, 2, "AAA", off=50),
    snap(*RB, 2, "AAA", off=30),
    # Wes plays in week 2 without recording a stat.
    snap(*WR, 2, "BBB", off=40),
    snap(*OL, 2, "BBB", off=80),
    snap(*OL, 19, "AAA", off=55),
    snap(*QB, 19, "AAA", off=55),
]


def game(week: int, home: str, away: str, score=(None, None), kind="REG") -> dict:
    return {
        "week": week,
        "game_type": kind,
        "home_team": home,
        "away_team": away,
        "home_score": score[0],
        "away_score": score[1],
    }


SCHEDULE_2026 = [
    game(1, "AAA", "BBB", (24, 17)),
    game(2, "AAA", "BBB", (10, 10)),
    game(3, "AAA", "CCC"),
    game(19, "AAA", "BBB", (7, 14), "WC"),
]
SCHEDULE_2025 = [game(1, "AAA", "BBB", (3, 0))]


def team_week(week, team, opponent, passing=200, sack=-10, rushing=100, picks=0, fumbles=0):
    return {
        "week": week,
        "team": team,
        "opponent_team": opponent,
        "passing_yards": passing,
        "sack_yards_lost": sack,
        "rushing_yards": rushing,
        "passing_interceptions": picks,
        "fumbles_lost_total": fumbles,
    }


TEAM_STATS_2026 = [
    team_week(1, "AAA", "BBB", passing=310, rushing=100),
    team_week(1, "BBB", "AAA", passing=210, rushing=60, picks=1, fumbles=1),
    team_week(2, "AAA", "BBB", passing=160, rushing=80, picks=1),
    team_week(2, "BBB", "AAA", passing=260, rushing=90),
    team_week(19, "AAA", "BBB", passing=110, rushing=50, picks=2),
    team_week(19, "BBB", "AAA", passing=240, rushing=120),
]


class FakeSource:
    """Serves the invented league."""

    def current_season(self) -> int:
        return 2026

    def weekly_stats(self, season):
        rows = STATS_2026 if season == 2026 else [stat(*QB, 1, "AAA", attempts=5)]
        return frame(STAT_COLUMNS, rows)

    def snap_counts(self, season):
        return frame(SNAP_COLUMNS, SNAPS_2026 if season == 2026 else [snap(*QB, 1, "AAA", off=5)])

    def schedules(self, season):
        return frame(SCHEDULE_COLUMNS, SCHEDULE_2026 if season == 2026 else SCHEDULE_2025)

    def team_stats(self, season):
        rows = TEAM_STATS_2026 if season == 2026 else [team_week(1, "AAA", "BBB")]
        return frame(TEAM_STAT_COLUMNS, rows)

    def rosters(self, season):
        rows = [
            {"gsis_id": "qb1", "full_name": "Quin Backer", "position": "QB", "team": "AAA",
             "jersey_number": 7},
            {"gsis_id": "lb1", "full_name": "Lou Barker", "position": "LB", "team": "BBB",
             "jersey_number": 52},
        ]  # fmt: skip
        return frame(ROSTER_COLUMNS, rows)

    def third_downs(self, season):
        return pl.DataFrame(
            {"team": ["AAA", "AAA"], "week": [1, 2], "converted": [4, 2], "failed": [6, 8]}
        )

    def players(self):
        ids = ["qb1", "rb1", "wr1", "lb1", "ol1"]
        return frame(PLAYER_COLUMNS, [{"gsis_id": i, "pfr_id": f"pfr-{i}"} for i in ids])

    def teams(self):
        return frame(
            TEAM_COLUMNS,
            [
                {"team_abbr": "AAA", "team_name": "Alpha Ants", "team_division": "North"},
                {"team_abbr": "BBB", "team_name": "Beta Bats", "team_division": "South"},
            ],
        )


@pytest.fixture
def source() -> FakeSource:
    return FakeSource()


@pytest.fixture
def service(source) -> NflService:
    return NflService(source, first_season=2025)


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        host="127.0.0.1",
        port=8000,
        cache_dir=tmp_path,
        cache_hours=24,
        first_season=2025,
        cors_origins=("http://web.test",),
    )
