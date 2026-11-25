"""HTTP endpoints matching the web app's DataProvider interface."""

from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from statpakd.config import Settings, load_settings
from statpakd.models import (
    Entity,
    GameLogEntry,
    League,
    RosterEntry,
    RosterUnitDef,
    StatDef,
    UiDefaults,
)
from statpakd.nfl.service import NflService, NotFound
from statpakd.nfl.source import DataUnavailable, DiskCache, NflverseSource

LEAGUES = (
    League(id="nfl", name="NFL", enabled=True),
    League(id="nba", name="NBA", enabled=False),
    League(id="mlb", name="MLB", enabled=False),
    League(id="nhl", name="NHL", enabled=False),
)


def build_service(settings: Settings) -> NflService:
    max_age = settings.cache_hours * 3600
    source = NflverseSource(DiskCache(settings.cache_dir, max_age))
    return NflService(source, settings.first_season, max_age)


def create_app(service: NflService | None = None, settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    nfl = service or build_service(settings)
    app = FastAPI(title="StatPakd API", description="Sports statistics for the StatPakd web app.")
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_methods=["GET"],
        allow_headers=["*"],
    )

    @app.exception_handler(NotFound)
    def not_found(_: Request, error: NotFound) -> JSONResponse:
        return JSONResponse({"detail": str(error)}, status_code=404)

    @app.exception_handler(DataUnavailable)
    def unavailable(_: Request, error: DataUnavailable) -> JSONResponse:
        return JSONResponse({"detail": str(error)}, status_code=503)

    def enabled(league_id: str) -> bool:
        """True for a league with data; False for a listed one without; 404 otherwise."""
        league = next((x for x in LEAGUES if x.id == league_id), None)
        if league is None:
            raise HTTPException(404, f"Unknown league: {league_id}")
        return league.enabled

    options = {"response_model_exclude_unset": True}
    base = "/api/leagues/{league_id}"

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/leagues", response_model=list[League])
    def leagues() -> list[League]:
        return list(LEAGUES)

    @app.get(f"{base}/seasons")
    def seasons(league_id: str) -> list[str]:
        return nfl.seasons() if enabled(league_id) else []

    @app.get(f"{base}/stat-defs", response_model=list[StatDef], **options)
    def stat_defs(league_id: str, kind: Literal["players", "teams"]):
        return nfl.stat_defs(kind) if enabled(league_id) else []

    @app.get(f"{base}/entities", response_model=list[Entity], **options)
    def entities(league_id: str, kind: Literal["players", "teams"], season: str):
        return nfl.entities(kind, season) if enabled(league_id) else []

    @app.get(f"{base}/roster-units", response_model=list[RosterUnitDef], **options)
    def roster_units(league_id: str):
        return nfl.roster_units() if enabled(league_id) else []

    @app.get(f"{base}/teams/{{team_id}}/roster", response_model=list[RosterEntry], **options)
    def roster(league_id: str, team_id: str, unit: str, season: str):
        return nfl.roster(team_id, unit, season) if enabled(league_id) else []

    @app.get(f"{base}/players/{{player_id}}/game-log", response_model=list[GameLogEntry], **options)
    def game_log(league_id: str, player_id: str, season: str):
        return nfl.game_log(player_id, season) if enabled(league_id) else []

    @app.get(f"{base}/ui-defaults", response_model=UiDefaults)
    def ui_defaults(league_id: str):
        if not enabled(league_id):
            raise HTTPException(404, f"No data for league: {league_id}")
        return nfl.ui_defaults()

    return app
