"""Team views: season team stats and rosters. Playoff games are included."""

import polars as pl

from statpakd.models import Entity, RosterEntry, StatMap
from statpakd.nfl.season import OFFENSIVE_LINE, SKILL_POSITIONS, Player, Season, Week


def _per(total: float, games: int) -> float:
    return round(total / games, 1)


def team_entities(
    season: Season, team_stats: pl.DataFrame, third_downs: pl.DataFrame, teams: pl.DataFrame
) -> list[Entity]:
    """Every team with a finished game, in alphabetical order."""
    names = {r["team_abbr"]: r for r in teams.iter_rows(named=True)}
    rows = list(team_stats.iter_rows(named=True))
    thirds = list(third_downs.iter_rows(named=True))
    entities: list[Entity] = []
    for abbr in season.teams:
        games = [g for g in season.games if g.played and abbr in (g.home, g.away)]
        count = len(games)
        scores = [
            (g.home_score, g.away_score) if g.home == abbr else (g.away_score, g.home_score)
            for g in games
        ]
        points = sum(own for own, _ in scores)
        allowed = sum(other for _, other in scores)
        wins = sum(own > other for own, other in scores)
        ties = sum(own == other for own, other in scores)
        losses = count - wins - ties

        mine = [r for r in rows if r["team"] == abbr]
        theirs = [r for r in rows if r["opponent_team"] == abbr]
        # Net passing yards: sack yardage counts against passing, whichever sign it is stored with.
        passing = lambda rs: sum(  # noqa: E731
            (r["passing_yards"] or 0) - abs(r["sack_yards_lost"] or 0) for r in rs
        )
        rushing = lambda rs: sum(r["rushing_yards"] or 0 for r in rs)  # noqa: E731
        giveaways = lambda rs: sum(  # noqa: E731
            (r["passing_interceptions"] or 0) + (r["fumbles_lost_total"] or 0) for r in rs
        )
        pass_yards, rush_yards = passing(mine), rushing(mine)
        yards = pass_yards + rush_yards
        converted = sum(r["converted"] or 0 for r in thirds if r["team"] == abbr)
        failed = sum(r["failed"] or 0 for r in thirds if r["team"] == abbr)
        # Yardage and turnover stats are blank until the stat tables cover the team.
        has_stats = bool(mine) and bool(theirs)
        played = len(mine) or count

        stats: StatMap = {
            "ppg": _per(points, count),
            "ypg": _per(yards, played) if has_stats else None,
            "pass": _per(pass_yards, played) if has_stats else None,
            "rush": _per(rush_yards, played) if has_stats else None,
            "third": (
                round(converted / (converted + failed) * 100, 1) if converted + failed else None
            ),
            "papg": _per(allowed, count),
            "to": int(giveaways(theirs) - giveaways(mine)) if has_stats else None,
            "win": round((wins + ties / 2) / count * 100, 1),
            "totPts": points,
            "passPct": round(pass_yards / yards * 100, 1) if has_stats and yards else None,
            "yapg": (_per(passing(theirs) + rushing(theirs), len(theirs)) if has_stats else None),
            "pdiff": _per(points - allowed, count),
            "wins": wins,
        }
        info = names.get(abbr, {})
        record = f"{wins}–{losses}" + (f"–{ties}" if ties else "")
        division = info.get("team_division")
        entities.append(
            Entity(
                id=abbr.lower(),
                name=info.get("team_name") or abbr,
                short_name=abbr,
                meta=f"{division} · {record}" if division else record,
                badge=abbr,
                stats=stats,
            )
        )
    return entities


def _share(season: Season, weeks: list[Week], side: int) -> int | None:
    """Percent of all the snaps the team ran that season, so missed games lower it."""
    team = weeks[0].team
    total = sum(counts[side] for (name, _), counts in season.team_snaps.items() if name == team)
    snaps = [w.offense_snaps if side == 0 else w.defense_snaps for w in weeks]
    played = [s for s in snaps if s is not None]
    return round(sum(played) / total * 100) if total and played else None


def _offense(season: Season, weeks: list[Week]) -> StatMap:
    total = lambda column: int(sum(w.value(column) for w in weeks))  # noqa: E731
    touches = total("carries") + total("receptions")
    scrim = total("rushing_yards") + total("receiving_yards")
    return {
        "snap": _share(season, weeks, 0),
        "touch": touches,
        "tgt": total("targets"),
        "scrim": scrim,
        "td": total("rushing_tds") + total("receiving_tds"),
        "ypt": round(scrim / touches, 1) if touches else None,
    }


def _defense(season: Season, weeks: list[Week]) -> StatMap:
    total = lambda column: sum(w.value(column) for w in weeks)  # noqa: E731
    picks = int(total("def_interceptions"))
    sacks = total("def_sacks")
    return {
        "snap": _share(season, weeks, 1),
        "tkl": int(
            total("def_tackles_solo")
            + total("def_tackles_with_assist")
            + total("def_tackle_assists")
        ),
        "sk": int(sacks) if sacks == int(sacks) else sacks,
        "take": picks + int(total("fumble_recovery_opp")),
        "int": picks,
        "pd": int(total("def_pass_defended")),
        "ff": int(total("def_fumbles_forced")),
    }


def _on_unit(player: Player, weeks: list[Week], unit: str) -> bool:
    if unit == "off":
        return player.position in SKILL_POSITIONS and any(w.offense_snaps for w in weeks)
    not_defense = SKILL_POSITIONS | OFFENSIVE_LINE
    return player.position not in not_defense and any(w.defense_snaps for w in weeks)


def roster(season: Season, team: str, unit: str) -> list[RosterEntry]:
    """Players who took snaps for the team on one side of the ball, most snaps first."""
    found: list[tuple[int, RosterEntry]] = []
    for player in season.players.values():
        weeks = [w for w in player.weeks.values() if w.team == team]
        if not weeks or not _on_unit(player, weeks, unit):
            continue
        build = _offense if unit == "off" else _defense
        snaps = sum((w.offense_snaps if unit == "off" else w.defense_snaps) or 0 for w in weeks)
        number = {"number": player.number} if player.number is not None else {}
        found.append(
            (
                snaps,
                RosterEntry(
                    id=player.id,
                    name=player.name,
                    position=player.position,
                    stats=build(season, weeks),
                    **number,
                ),
            )
        )
    return [entry for _, entry in sorted(found, key=lambda f: (-f[0], f[1].name))]
