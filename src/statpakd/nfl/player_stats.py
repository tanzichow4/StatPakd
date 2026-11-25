"""Player views: season totals and the week-by-week log."""

from statpakd.models import Entity, GameLogEntry, StatMap
from statpakd.nfl.season import (
    PLAYOFF_ROUNDS,
    REGULAR,
    SKILL_POSITIONS,
    Player,
    Season,
    Week,
)
from statpakd.nfl.statdefs import PASSER_RATING, PLAYER_STATS
from statpakd.rollup import rollup

# A season rate stays blank until the player has at least this many of the thing it divides by.
MINIMUMS = {
    "cmp": ("passAtt", 30),
    "rate": ("passAtt", 30),
    "tdInt": ("passAtt", 30),
    "ypc": ("carries", 30),
    "ypr": ("rec", 10),
    "ypt": ("touches", 20),
}
PER_GAME = {"passYpg": "passYds", "rushYpg": "rushYds", "recYpg": "recYds"}
_DEFS = {d.key: d for d in PLAYER_STATS}


def _ratio(num: float, den: float, scale: float = 1) -> float | None:
    return round(num / den * scale, 1) if den else None


def is_listed(player: Player) -> bool:
    """Skill position players who took an offensive snap or touched the ball."""
    if player.position not in SKILL_POSITIONS:
        return False
    return any(
        (w.offense_snaps or 0) > 0
        or w.value("attempts") + w.value("carries") + w.value("targets") > 0
        for w in player.weeks.values()
    )


def _passes(player: Player) -> bool:
    return player.position == "QB" or any(w.value("attempts") for w in player.weeks.values())


def _receives(player: Player) -> bool:
    return player.position != "QB" or any(w.value("targets") for w in player.weeks.values())


def week_stats(season: Season, player: Player, week: Week) -> StatMap:
    """The stats of one game. Stats that do not apply to the player are None."""
    passing = _passes(player)
    receiving = _receives(player)
    count = lambda column: int(week.value(column))  # noqa: E731
    attempts, completions = count("attempts"), count("completions")
    pass_yards, pass_tds = count("passing_yards"), count("passing_tds")
    picks = count("passing_interceptions")
    carries, rush_yards = count("carries"), count("rushing_yards")
    rush_tds = count("rushing_tds")
    catches, targets = count("receptions"), count("targets")
    rec_yards, rec_tds = count("receiving_yards"), count("receiving_tds")

    scrim = rush_yards + (rec_yards if receiving else 0)
    touches = carries + (catches if receiving else 0)
    team = season.team_snaps.get((week.team, week.week), (0, 0))[0]
    snaps = week.offense_snaps if team else None

    passing_values: StatMap = {
        "passYds": pass_yards,
        "passTd": pass_tds,
        "int": picks,
        "passAtt": attempts,
        "passCmp": completions,
    }
    stats: StatMap = {
        **(passing_values if passing else dict.fromkeys(passing_values)),
        "cmp": _ratio(completions, attempts, 100) if passing else None,
        "tdInt": _ratio(pass_tds, max(picks, 1)) if passing and attempts else None,
        "rushYds": rush_yards,
        "rushTd": rush_tds,
        "carries": carries,
        "ypc": _ratio(rush_yards, carries),
        "rec": catches if receiving else None,
        "recYds": rec_yards if receiving else None,
        "recTd": rec_tds if receiving else None,
        "tgt": targets if receiving else None,
        "ypr": _ratio(rec_yards, catches) if receiving else None,
        "scrim": scrim,
        "totTd": rush_tds + (rec_tds if receiving else 0),
        "touches": touches,
        "ypt": _ratio(scrim, touches),
        "snaps": snaps,
        "teamSnaps": team if snaps is not None else None,
        "snapPct": _ratio(snaps, team, 100) if snaps is not None else None,
    }
    rating = _DEFS["rate"].model_copy(update={"rollup": PASSER_RATING})
    stats["rate"] = rollup(rating, [stats]) if passing else None
    return stats


def season_stats(weeks: list[StatMap]) -> StatMap:
    """Season totals from the weekly stats, with small-sample rates left blank."""
    totals: StatMap = {
        key: rollup(stat, weeks) for key, stat in _DEFS.items() if key not in PER_GAME
    }
    for key, (volume, minimum) in MINIMUMS.items():
        if (totals.get(volume) or 0) < minimum:
            totals[key] = None
    for key, source in PER_GAME.items():
        total = totals.get(source)
        totals[key] = None if total is None or not weeks else round(total / len(weeks), 1)
    return totals


def short_name(name: str) -> str:
    """First initial and the rest of the name: "Amon-Ra St. Brown" -> "A. St. Brown"."""
    first, _, rest = name.partition(" ")
    return f"{first[0]}. {rest}" if first and rest else name


def player_entities(season: Season) -> list[Entity]:
    """Every listed player of a season, the most productive first."""
    entities: list[Entity] = []
    for player in season.players.values():
        if not is_listed(player):
            continue
        weeks = [week_stats(season, player, player.weeks[w]) for w in sorted(player.weeks)]
        team = player.latest_team
        meta = f"{team} · {player.position}"
        if player.number is not None:
            meta += f" · #{player.number}"
        entities.append(
            Entity(
                id=player.id,
                name=player.name,
                short_name=short_name(player.name),
                meta=meta,
                badge=player.position,
                position=player.position,
                team_id=team.lower(),
                stats=season_stats(weeks),
            )
        )
    yards = lambda e: (e.stats.get("passYds") or 0) + (e.stats.get("scrim") or 0)  # noqa: E731
    return sorted(entities, key=lambda e: (-yards(e), e.name, e.id))


def game_log(season: Season, player: Player) -> list[GameLogEntry]:
    """One entry for each week so far. Playoff weeks appear only if the player's team played."""
    entries: list[GameLogEntry] = []
    team = player.weeks[min(player.weeks)].team
    for number in range(1, season.last_week + 1):
        week = player.weeks.get(number)
        if week:
            team = week.team
        game_type = season.game_type(number)
        game = season.game(team, number)
        if game_type == REGULAR:
            label, short, tick, phase = f"Week {number}", f"W{number}", None, "Regular season"
        else:
            label, short = PLAYOFF_ROUNDS.get(game_type, (game_type, game_type))
            tick, phase = short, "Playoffs"
            if week is None and (game is None or not game.played):
                continue
        note = None
        if week is None:
            if game is None:
                note = "Bye"
            elif not game.played:
                # The team's game this week has not finished yet.
                continue
            else:
                note = "Did not play"
        optional = {k: v for k, v in (("tick_label", tick), ("note", note)) if v is not None}
        entries.append(
            GameLogEntry(
                period=number,
                label=label,
                short_label=short,
                played=week is not None,
                stats=week_stats(season, player, week) if week else {},
                phase=phase,
                **optional,
            )
        )
    return entries
