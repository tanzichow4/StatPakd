import polars as pl
import pytest

from statpakd.nfl.player_stats import is_listed, short_name
from statpakd.nfl.service import NflService, NotFound
from statpakd.nfl.statdefs import PLAYER_STATS


def by_id(items):
    return {item.id: item for item in items}


def weeks(service, player, season="2026"):
    return {e.period: e for e in service.game_log(player, season)}


def test_seasons_are_newest_first(service):
    assert service.seasons() == ["2026", "2025"]


def test_a_season_without_a_result_is_not_offered(source):
    source.schedules = lambda season, real=source.schedules: (
        real(season).clear() if season == 2026 else real(season)
    )
    assert NflService(source, first_season=2025).seasons() == ["2025"]


def test_only_skill_players_are_listed_most_productive_first(service):
    players = service.entities("players", "2026")
    assert [p.id for p in players] == ["qb1", "rb1", "wr1"]


def test_players_who_never_touch_the_offence_are_not_listed(service):
    season = service.season("2026")
    assert not is_listed(season.players["lb1"])
    assert not is_listed(season.players["ol1"])


def test_player_card_fields(service):
    quin = by_id(service.entities("players", "2026"))["qb1"]
    assert (quin.name, quin.short_name, quin.meta) == ("Quin Backer", "Q. Backer", "AAA · QB · #7")
    assert (quin.badge, quin.position, quin.team_id) == ("QB", "QB", "aaa")


def test_short_name_keeps_the_whole_surname():
    assert short_name("Wes Ray-Lee") == "W. Ray-Lee"
    assert short_name("Mono") == "Mono"


def test_season_totals_include_the_playoffs(service):
    stats = by_id(service.entities("players", "2026"))["qb1"].stats
    assert (stats["passYds"], stats["passAtt"], stats["passCmp"]) == (400, 60, 40)
    assert (stats["passTd"], stats["int"]) == (3, 2)
    assert stats["cmp"] == 66.7
    assert stats["passYpg"] == 200.0
    assert (stats["snaps"], stats["snapPct"]) == (115, 100.0)


def test_passer_rating_uses_the_official_formula_on_totals(service):
    # 40 of 60 for 400 yards, 3 touchdowns, 2 interceptions:
    # (1.8333 + 0.9167 + 1.0 + 1.5417) / 6 * 100.
    assert by_id(service.entities("players", "2026"))["qb1"].stats["rate"] == 88.2


def test_stats_that_do_not_apply_are_none(service):
    players = by_id(service.entities("players", "2026"))
    assert players["rb1"].stats["passYds"] is None
    assert players["qb1"].stats["rec"] is None


def test_a_trick_play_pass_counts_without_rating_the_player_as_a_passer(source):
    real = source.weekly_stats

    def with_trick_play(season):
        frame = real(season)
        threw = (pl.col("player_id") == "wr1") & (pl.col("week") == 1)
        return frame.with_columns(
            pl.when(threw).then(1).otherwise(pl.col("attempts")).alias("attempts"),
            pl.when(threw).then(1).otherwise(pl.col("completions")).alias("completions"),
            pl.when(threw).then(35).otherwise(pl.col("passing_yards")).alias("passing_yards"),
        )

    source.weekly_stats = with_trick_play
    service = NflService(source, first_season=2025)
    log = weeks(service, "wr1")
    assert (log[1].stats["passYds"], log[2].stats["passYds"]) == (35, None)
    assert (log[1].stats["cmp"], log[1].stats["rate"]) == (None, None)
    season = by_id(service.entities("players", "2026"))["wr1"].stats
    assert (season["passYds"], season["cmp"], season["rate"]) == (35, None, None)


def test_small_samples_leave_season_rates_blank(service):
    players = by_id(service.entities("players", "2026"))
    # 35 carries is enough for yards per carry; 2 catches is not enough for yards per catch.
    assert players["rb1"].stats["ypc"] == 4.1
    assert players["rb1"].stats["ypr"] is None
    assert players["wr1"].stats["ypr"] is None


def test_every_player_has_every_stat(service):
    keys = {d.key for d in PLAYER_STATS}
    for player in service.entities("players", "2026"):
        assert keys <= set(player.stats)


def test_game_log_labels_weeks_and_playoffs(service):
    log = weeks(service, "qb1")
    assert (log[1].label, log[1].short_label, log[1].phase) == ("Week 1", "W1", "Regular season")
    assert (log[19].label, log[19].tick_label, log[19].phase) == ("Wild Card", "WC", "Playoffs")


def test_game_log_tells_a_missed_game_from_a_played_one(service):
    log = weeks(service, "qb1")
    assert log[2].played is False
    assert log[2].note == "Did not play"
    assert log[2].stats == {}


def test_game_log_stops_at_the_last_finished_week_it_applies_to(service):
    # Week 3 is scheduled but unplayed, and weeks 4 to 18 have no games for this team.
    assert 3 not in weeks(service, "qb1")


def test_game_log_marks_a_bye(service):
    notes = {w: e.note for w, e in weeks(service, "qb1").items()}
    assert notes[4] == "Bye"


def test_game_log_omits_playoff_weeks_without_a_game(source):
    source.schedules = lambda season, real=source.schedules: real(season).filter(
        real(season)["game_type"] == "REG"
    )
    service = NflService(source, first_season=2025)
    assert max(weeks(service, "rb1")) <= 18


def test_a_week_with_snaps_but_no_stats_counts_as_zeros(service):
    week = weeks(service, "wr1")[2]
    assert week.played is True
    assert week.stats["recYds"] == 0
    assert week.stats["snaps"] == 40
    assert week.stats["snapPct"] == 50.0


def test_a_week_without_snap_data_has_no_snap_values(source):
    source.snap_counts = lambda season, real=source.snap_counts: real(season).clear()
    week = weeks(NflService(source, first_season=2025), "qb1")[1]
    assert (week.stats["snaps"], week.stats["snapPct"], week.stats["teamSnaps"]) == (
        None,
        None,
        None,
    )


def test_a_known_player_without_a_season_has_an_empty_log(service):
    assert service.game_log("rb1", "2025") == []


def test_unknown_player_season_team_and_unit(service):
    with pytest.raises(NotFound, match="Unknown player"):
        service.game_log("nobody", "2026")
    with pytest.raises(NotFound, match="Unknown season"):
        service.entities("players", "1999")
    for team in ("zzz", "AAA"):
        with pytest.raises(NotFound, match="Unknown team"):
            service.roster(team, "off", "2026")
    with pytest.raises(NotFound, match="Unknown unit"):
        service.roster("aaa", "special", "2026")


def test_team_stats_over_every_game(service):
    ants = by_id(service.entities("teams", "2026"))["aaa"]
    assert (ants.name, ants.short_name, ants.meta) == ("Alpha Ants", "AAA", "North · 1–1–1")
    # Points 24 + 10 + 7 for, 17 + 10 + 14 against, over three games.
    assert (ants.stats["totPts"], ants.stats["ppg"], ants.stats["papg"]) == (41, 13.7, 13.7)
    assert (ants.stats["wins"], ants.stats["win"], ants.stats["pdiff"]) == (1, 50.0, 0.0)


def test_team_yards_are_net_of_sacks_and_turnovers_are_a_difference(service):
    stats = by_id(service.entities("teams", "2026"))["aaa"].stats
    # Passing 300 + 150 + 100 and rushing 100 + 80 + 50 over three games.
    assert (stats["pass"], stats["rush"], stats["ypg"]) == (183.3, 76.7, 260.0)
    assert stats["yapg"] == 316.7
    # Two taken away, three given away.
    assert stats["to"] == -1
    assert stats["third"] == 30.0


def test_offense_roster(service):
    roster = service.roster("aaa", "off", "2026")
    assert [r.id for r in roster] == ["qb1", "rb1"]
    rory = by_id(roster)["rb1"]
    assert rory.stats == {"snap": 45, "touch": 37, "tgt": 3, "scrim": 160, "td": 1, "ypt": 4.3}


def test_defense_roster_counts_tackles_and_takeaways(service):
    roster = by_id(service.roster("bbb", "def", "2026"))
    lou = roster["lb1"]
    assert lou.number == 52
    assert lou.stats == {
        "snap": 100,
        "tkl": 9,
        "sk": 1.5,
        "take": 2,
        "int": 1,
        "pd": 2,
        "ff": 1,
    }
    # A player without a league id is still listed, under the snap data's id.
    assert "pfr-ol2" in roster


def test_ui_defaults_pick_the_latest_season_and_leaders(service):
    defaults = service.ui_defaults()
    assert defaults.season == "2026"
    assert defaults.players.sel == ["qb1", "rb1", "wr1"]
    # Both teams are 1-1-1 with no point difference, so they fall back to id order.
    assert defaults.teams.sel == ["aaa", "bbb"]
    assert defaults.team_id == "aaa"


def test_seasons_are_built_once(source):
    calls = []
    real = source.weekly_stats
    source.weekly_stats = lambda season: calls.append(season) or real(season)
    service = NflService(source, first_season=2025)
    service.entities("players", "2026")
    service.game_log("qb1", "2026")
    assert calls == [2026]
