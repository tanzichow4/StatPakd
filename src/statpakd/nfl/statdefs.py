"""NFL stat definitions. Keys, labels and order match the web app's sample data."""

from statpakd.models import (
    CompositeRollup,
    CompositeTerm,
    RatioRollup,
    RosterUnitDef,
    StatDef,
)


def _stat(key: str, label: str, group: str, **options) -> StatDef:
    return StatDef(key=key, label=label, group=group, **options)


def _ratio(num: str, den: str, **options) -> RatioRollup:
    return RatioRollup(kind="ratio", num=num, den=den, **options)


# The official passer rating, built from season or multi-week totals.
PASSER_RATING = CompositeRollup(
    kind="composite",
    den="passAtt",
    max=2.375,
    scale=100 / 6,
    terms=[
        CompositeTerm(num="passCmp", offset=-0.3, factor=5),
        CompositeTerm(num="passYds", offset=-3, factor=0.25),
        CompositeTerm(num="passTd", offset=0, factor=20),
        CompositeTerm(num="int", offset=-0.095, factor=-25),
    ],
)

PLAYER_STATS: tuple[StatDef, ...] = (
    _stat("passYds", "Pass Yds", "Passing"),
    _stat("passTd", "Pass TD", "Passing"),
    _stat("int", "Interceptions", "Passing", lower_is_better=True),
    _stat("cmp", "Comp %", "Passing", decimals=1, rollup=_ratio("passCmp", "passAtt", scale=100)),
    _stat("rate", "Passer Rating", "Passing", decimals=1, rollup=PASSER_RATING),
    _stat("rushYds", "Rush Yds", "Rushing"),
    _stat("rushTd", "Rush TD", "Rushing"),
    _stat("ypc", "Yds / Carry", "Rushing", decimals=1, rollup=_ratio("rushYds", "carries")),
    _stat("rec", "Receptions", "Receiving"),
    _stat("recYds", "Rec Yds", "Receiving"),
    _stat("recTd", "Rec TD", "Receiving"),
    _stat("ypr", "Yds / Catch", "Receiving", decimals=1, rollup=_ratio("recYds", "rec")),
    _stat("scrim", "Scrimmage Yds", "Totals"),
    _stat("totTd", "Scrimmage TD", "Totals"),
    _stat("passYpg", "Pass Yds / G", "Passing", decimals=1, extra=True),
    _stat(
        "tdInt",
        "TD : INT",
        "Passing",
        decimals=1,
        extra=True,
        rollup=_ratio("passTd", "int", min_den=1),
    ),
    _stat("carries", "Carries", "Rushing", extra=True),
    _stat("rushYpg", "Rush Yds / G", "Rushing", decimals=1, extra=True),
    _stat("tgt", "Targets", "Receiving", extra=True),
    _stat("recYpg", "Rec Yds / G", "Receiving", decimals=1, extra=True),
    _stat("touches", "Touches", "Totals", extra=True),
    _stat(
        "ypt", "Yds / Touch", "Totals", decimals=1, extra=True, rollup=_ratio("scrim", "touches")
    ),
    _stat("passAtt", "Pass Attempts", "Passing", extra=True),
    _stat("passCmp", "Completions", "Passing", extra=True),
    _stat("snaps", "Snaps", "Usage"),
    _stat(
        "snapPct",
        "Snap %",
        "Usage",
        decimals=1,
        rollup=_ratio("snaps", "teamSnaps", scale=100),
    ),
)

TEAM_STATS: tuple[StatDef, ...] = (
    _stat("ppg", "Points / G", "Offense", decimals=1, summary_label="Pts / G"),
    _stat("ypg", "Yards / G", "Offense", decimals=1, summary_label="Yds / G"),
    _stat("pass", "Pass Yds / G", "Offense", decimals=1),
    _stat("rush", "Rush Yds / G", "Offense", decimals=1),
    _stat("third", "3rd Down %", "Offense", decimals=1),
    _stat(
        "papg",
        "Pts Allowed / G",
        "Defense",
        decimals=1,
        lower_is_better=True,
        summary_label="Allowed / G",
    ),
    _stat("to", "Turnover Diff", "Overall", signed=True, summary_label="TO Diff"),
    _stat("win", "Win %", "Overall", decimals=1),
    _stat("totPts", "Total Points", "Offense", extra=True),
    _stat("passPct", "Pass Yds Share %", "Offense", decimals=1, extra=True),
    _stat("yapg", "Yds Allowed / G", "Defense", decimals=1, lower_is_better=True, extra=True),
    _stat("pdiff", "Point Diff / G", "Overall", decimals=1, signed=True, extra=True),
    _stat("wins", "Wins", "Overall", extra=True),
)

ROSTER_UNITS: tuple[RosterUnitDef, ...] = (
    RosterUnitDef(
        key="off",
        label="Offense",
        stats=[
            _stat("snap", "Snap %", "Offense", percent=True),
            _stat("touch", "Touches", "Offense", share_label="Touches"),
            _stat("tgt", "Targets", "Offense", share_label="Targets"),
            _stat("scrim", "Scrim Yds", "Offense", share_label="Scrimmage Yds"),
            _stat("td", "TD", "Offense", share_label="Touchdowns"),
            _stat("ypt", "Yds / Touch", "Offense", decimals=1),
        ],
    ),
    RosterUnitDef(
        key="def",
        label="Defense",
        stats=[
            _stat("snap", "Snap %", "Defense", percent=True),
            _stat("tkl", "Tackles", "Defense", share_label="Tackles"),
            _stat("sk", "Sacks", "Defense", share_label="Sacks"),
            _stat("take", "Takeaways", "Defense", extra=True, share_label="Takeaways"),
            _stat("int", "INT", "Defense"),
            _stat("pd", "Pass Def", "Defense", share_label="Passes Defended"),
            _stat("ff", "Forced Fum", "Defense"),
        ],
    ),
)
