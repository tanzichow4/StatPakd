"""Settings from environment variables. Every setting has a default."""

import os
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path

from platformdirs import user_cache_dir

DEFAULT_ORIGINS = ("http://localhost:5173", "http://127.0.0.1:5173")


@dataclass(frozen=True)
class Settings:
    host: str
    port: int
    cache_dir: Path
    cache_hours: float
    first_season: int
    cors_origins: tuple[str, ...]


def load_settings(env: Mapping[str, str] | None = None) -> Settings:
    env = os.environ if env is None else env
    origins = env.get("STATPAKD_CORS_ORIGINS")
    return Settings(
        host=env.get("STATPAKD_HOST", "127.0.0.1"),
        port=int(env.get("STATPAKD_PORT", "8000")),
        cache_dir=Path(env.get("STATPAKD_CACHE_DIR") or user_cache_dir("statpakd", False)),
        cache_hours=float(env.get("STATPAKD_CACHE_HOURS", "24")),
        first_season=int(env.get("STATPAKD_FIRST_SEASON", "2022")),
        cors_origins=(
            tuple(o.strip() for o in origins.split(",") if o.strip())
            if origins is not None
            else DEFAULT_ORIGINS
        ),
    )
