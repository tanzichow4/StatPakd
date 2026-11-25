"""Response models mirroring web/src/domain/types.ts. Field names are camelCase on the wire.

Optional fields are left unset (not set to None) so they are omitted from responses. A ``None``
stat value is different: it is sent as ``null`` and means "not applicable".
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

StatMap = dict[str, float | int | None]


class Model(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class League(Model):
    id: str
    name: str
    enabled: bool


class AverageRollup(Model):
    kind: Literal["average"] = "average"


class RatioRollup(Model):
    kind: Literal["ratio"]
    num: str
    den: str
    scale: float | None = None
    min_den: float | None = None


class CompositeTerm(Model):
    num: str
    offset: float
    factor: float


class CompositeRollup(Model):
    """Sum over the terms of clamp((num / den + offset) * factor, 0, max), times scale."""

    kind: Literal["composite"]
    den: str
    max: float
    scale: float
    terms: list[CompositeTerm]


Rollup = AverageRollup | RatioRollup | CompositeRollup


class StatDef(Model):
    key: str
    label: str
    group: str
    decimals: int | None = None
    lower_is_better: bool | None = None
    signed: bool | None = None
    extra: bool | None = None
    summary_label: str | None = None
    share_label: str | None = None
    percent: bool | None = None
    rollup: Rollup | None = None


class RosterUnitDef(Model):
    key: str
    label: str
    stats: list[StatDef]


class Entity(Model):
    id: str
    name: str
    short_name: str
    meta: str
    badge: str
    position: str | None = None
    team_id: str | None = None
    stats: StatMap


class RosterEntry(Model):
    id: str
    name: str
    position: str
    number: int | None = None
    stats: StatMap


class GameLogEntry(Model):
    period: int
    label: str
    short_label: str
    played: bool
    stats: StatMap
    tick_label: str | None = None
    phase: str | None = None
    note: str | None = None


class KindDefaults(Model):
    sel: list[str]
    stats: list[str]
    ax: tuple[str, str, str]


class UiDefaults(Model):
    season: str
    team_id: str
    unit: str
    sort_key: str
    players: KindDefaults
    teams: KindDefaults
