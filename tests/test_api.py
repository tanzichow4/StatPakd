import pytest
from fastapi.testclient import TestClient

from statpakd.api import create_app
from statpakd.config import load_settings
from statpakd.nfl.source import DataUnavailable

BASE = "/api/leagues/nfl"


@pytest.fixture
def client(service, settings) -> TestClient:
    return TestClient(create_app(service, settings))


def ok(client, path):
    response = client.get(path)
    assert response.status_code == 200, response.text
    return response.json()


def test_health_and_leagues(client):
    assert ok(client, "/api/health") == {"status": "ok"}
    leagues = ok(client, "/api/leagues")
    assert [(x["id"], x["enabled"]) for x in leagues] == [
        ("nfl", True),
        ("nba", False),
        ("mlb", False),
        ("nhl", False),
    ]


def test_seasons(client):
    assert ok(client, f"{BASE}/seasons") == ["2026", "2025"]


def test_stat_defs_use_camel_case_and_omit_unset_fields(client):
    players = ok(client, f"{BASE}/stat-defs?kind=players")
    assert players[0] == {"key": "passYds", "label": "Pass Yds", "group": "Passing"}
    picks = next(d for d in players if d["key"] == "int")
    assert picks["lowerIsBetter"] is True
    rating = next(d for d in players if d["key"] == "rate")
    assert rating["rollup"]["kind"] == "composite"
    ratio = next(d for d in players if d["key"] == "tdInt")
    assert ratio["rollup"] == {"kind": "ratio", "num": "passTd", "den": "int", "minDen": 1}
    teams = ok(client, f"{BASE}/stat-defs?kind=teams")
    assert teams[0]["summaryLabel"] == "Pts / G"


def test_entities_send_null_for_stats_that_do_not_apply(client):
    players = ok(client, f"{BASE}/entities?kind=players&season=2026")
    rory = next(p for p in players if p["id"] == "rb1")
    assert rory["shortName"] == "R. Bell"
    assert "passYds" in rory["stats"] and rory["stats"]["passYds"] is None
    teams = ok(client, f"{BASE}/entities?kind=teams&season=2026")
    assert "teamId" not in teams[0] and "position" not in teams[0]


def test_roster_units_and_roster(client):
    assert [u["key"] for u in ok(client, f"{BASE}/roster-units")] == ["off", "def"]
    roster = ok(client, f"{BASE}/teams/aaa/roster?unit=off&season=2026")
    assert roster[0]["number"] == 7
    assert "number" not in roster[1]


def test_game_log(client):
    log = ok(client, f"{BASE}/players/qb1/game-log?season=2026")
    assert log[0]["shortLabel"] == "W1"
    assert "note" not in log[0]
    assert log[1]["note"] == "Did not play"
    assert log[-1]["tickLabel"] == "WC"


def test_ui_defaults(client):
    defaults = ok(client, f"{BASE}/ui-defaults")
    assert defaults["teamId"] == "aaa"
    assert defaults["sortKey"] == "snap"
    assert len(defaults["players"]["ax"]) == 3


@pytest.mark.parametrize(
    "path",
    [
        "/api/leagues/zzz/seasons",
        f"{BASE}/entities?kind=players&season=1999",
        f"{BASE}/teams/zzz/roster?unit=off&season=2026",
        f"{BASE}/teams/aaa/roster?unit=zzz&season=2026",
        f"{BASE}/players/nobody/game-log?season=2026",
        "/api/leagues/nba/ui-defaults",
    ],
)
def test_unknown_things_are_not_found(client, path):
    response = client.get(path)
    assert response.status_code == 404
    assert response.json()["detail"]


def test_invalid_kind_is_rejected(client):
    assert client.get(f"{BASE}/entities?kind=coaches&season=2026").status_code == 422


@pytest.mark.parametrize(
    "path",
    [
        "seasons",
        "stat-defs?kind=players",
        "entities?kind=teams&season=2026",
        "roster-units",
        "teams/aaa/roster?unit=off&season=2026",
        "players/qb1/game-log?season=2026",
    ],
)
def test_a_listed_league_without_data_is_empty(client, path):
    assert ok(client, f"/api/leagues/nba/{path}") == []


def test_download_failure_is_reported_as_unavailable(service, source, settings):
    def fail(season):
        raise DataUnavailable("Could not download stats")

    source.weekly_stats = fail
    response = TestClient(create_app(service, settings)).get(f"{BASE}/seasons")
    assert response.status_code == 503
    assert response.json() == {"detail": "Could not download stats"}


def test_cors_allows_only_the_configured_origin(client):
    allowed = client.get("/api/health", headers={"Origin": "http://web.test"})
    assert allowed.headers["access-control-allow-origin"] == "http://web.test"
    other = client.get("/api/health", headers={"Origin": "http://other.test"})
    assert "access-control-allow-origin" not in other.headers


def test_openapi_docs_are_served(client):
    paths = ok(client, "/openapi.json")["paths"]
    assert "/api/leagues/{league_id}/players/{player_id}/game-log" in paths


def test_settings_defaults_and_overrides(tmp_path):
    defaults = load_settings({})
    assert (defaults.host, defaults.port, defaults.first_season) == ("127.0.0.1", 8000, 2022)
    assert "http://localhost:5173" in defaults.cors_origins
    custom = load_settings(
        {
            "STATPAKD_PORT": "9000",
            "STATPAKD_CACHE_DIR": str(tmp_path),
            "STATPAKD_CORS_ORIGINS": "http://a.test, http://b.test",
        }
    )
    assert (custom.port, custom.cache_dir) == (9000, tmp_path)
    assert custom.cors_origins == ("http://a.test", "http://b.test")
