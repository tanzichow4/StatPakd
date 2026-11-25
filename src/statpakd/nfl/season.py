"""One season of player weeks, joined from weekly stats, snap counts and the schedule."""

from dataclasses import dataclass, field

import polars as pl

from statpakd.nfl.source import Source

SKILL_POSITIONS = frozenset({"QB", "RB", "FB", "WR", "TE"})
OFFENSIVE_LINE = frozenset({"C", "G", "T", "OL", "OG", "OT"})
REGULAR = "REG"
# Playoff round -> (label, short label).
PLAYOFF_ROUNDS = {
    "WC": ("Wild Card", "WC"),
    "DIV": ("Divisional", "DIV"),
    "CON": ("Conference", "CONF"),
    "SB": ("Super Bowl", "SB"),
}


@dataclass
class Week:
    """What one player did in one game. ``stats`` and the snap counts may each be missing."""

    week: int
    team: str
    stats: dict | None = None
    offense_snaps: int | None = None
    defense_snaps: int | None = None

    def value(self, column: str) -> float:
        """A stat column, with zero for a player who took the field but recorded nothing."""
        return (self.stats or {}).get(column) or 0


@dataclass
class Player:
    id: str
    name: str
    position: str
    number: int | None = None
    weeks: dict[int, Week] = field(default_factory=dict)

    @property
    def latest_team(self) -> str:
        return self.weeks[max(self.weeks)].team


@dataclass(frozen=True)
class Game:
    week: int
    game_type: str
    home: str
    away: str
    home_score: int | None
    away_score: int | None

    @property
    def played(self) -> bool:
        return self.home_score is not None and self.away_score is not None


@dataclass
class Season:
    year: int
    players: dict[str, Player]
    games: list[Game]
    # (team, week) -> plays run by the offence and by the defence.
    team_snaps: dict[tuple[str, int], tuple[int, int]]

    @property
    def last_week(self) -> int:
        """The latest week with a finished game; 0 before the season starts."""
        return max((g.week for g in self.games if g.played), default=0)

    def game(self, team: str, week: int) -> Game | None:
        return next((g for g in self.games if g.week == week and team in (g.home, g.away)), None)

    def game_type(self, week: int) -> str:
        return next((g.game_type for g in self.games if g.week == week), REGULAR)

    @property
    def teams(self) -> list[str]:
        """Teams with at least one finished game, in alphabetical order."""
        return sorted({t for g in self.games if g.played for t in (g.home, g.away)})


def _games(schedules: pl.DataFrame) -> list[Game]:
    return [
        Game(
            week=row["week"],
            game_type=row["game_type"],
            home=row["home_team"],
            away=row["away_team"],
            home_score=row["home_score"],
            away_score=row["away_score"],
        )
        for row in schedules.iter_rows(named=True)
    ]


def load_season(source: Source, year: int) -> Season:
    """Join the tables of one season into players with their weeks."""
    gsis_by_pfr = {
        row["pfr_id"]: row["gsis_id"]
        for row in source.players().iter_rows(named=True)
        if row["pfr_id"] and row["gsis_id"]
    }
    players: dict[str, Player] = {}
    roster = {r["gsis_id"]: r for r in source.rosters(year).iter_rows(named=True) if r["gsis_id"]}

    def player(player_id: str, name: str, position: str | None) -> Player:
        found = players.get(player_id)
        if found is None:
            listed = roster.get(player_id, {})
            found = players[player_id] = Player(
                id=player_id,
                name=name or listed.get("full_name") or player_id,
                position=position or listed.get("position") or "",
                number=listed.get("jersey_number"),
            )
        return found

    for row in source.weekly_stats(year).iter_rows(named=True):
        if not row["player_id"] or not row["team"]:
            continue
        who = player(row["player_id"], row["player_display_name"], row["position"])
        who.weeks[row["week"]] = Week(week=row["week"], team=row["team"], stats=row)

    team_snaps: dict[tuple[str, int], tuple[int, int]] = {}
    for row in source.snap_counts(year).iter_rows(named=True):
        offense = int(row["offense_snaps"] or 0)
        defense = int(row["defense_snaps"] or 0)
        key = (row["team"], row["week"])
        # Someone on each side plays every snap, so the highest count is the team total.
        most = team_snaps.get(key, (0, 0))
        team_snaps[key] = (max(most[0], offense), max(most[1], defense))
        if offense == 0 and defense == 0:
            continue
        player_id = gsis_by_pfr.get(row["pfr_player_id"]) or row["pfr_player_id"]
        if not player_id:
            continue
        who = player(player_id, row["player"], row["position"])
        week = who.weeks.get(row["week"])
        if week is None:
            week = who.weeks[row["week"]] = Week(week=row["week"], team=row["team"])
        week.offense_snaps = offense
        week.defense_snaps = defense

    return Season(
        year=year,
        players=players,
        games=_games(source.schedules(year)),
        team_snaps=team_snaps,
    )
