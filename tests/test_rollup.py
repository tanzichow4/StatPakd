import pytest

from statpakd.models import AverageRollup, RatioRollup, StatDef
from statpakd.nfl.statdefs import PASSER_RATING
from statpakd.rollup import rollup


def stat(rule=None, key="n", decimals=None):
    options = {} if decimals is None else {"decimals": decimals}
    return StatDef(key=key, label=key, group="g", rollup=rule, **options)


def test_adds_counting_stats_and_skips_missing_values():
    assert rollup(stat(), [{"n": 10}, {"n": None}, {"n": 5}]) == 15
    assert rollup(stat(decimals=1), [{"n": 0.5}, {"n": 1.0}]) == 1.5


def test_no_values_gives_no_total():
    assert rollup(stat(), []) is None
    assert rollup(stat(), [{"n": None}]) is None


def test_average():
    assert rollup(stat(AverageRollup(), decimals=1), [{"n": 80}, {"n": 91}]) == 85.5


def test_ratio_with_a_zero_denominator():
    rule = RatioRollup(kind="ratio", num="n", den="d")
    weeks = [{"n": 5, "d": 0}]
    assert rollup(stat(rule, "q"), weeks) is None
    assert rollup(stat(rule.model_copy(update={"min_den": 1}), "q"), weeks) == 5


@pytest.mark.parametrize(
    ("att", "cmp", "yds", "td", "picks", "expected"),
    [
        (60, 40, 400, 3, 2, 88.2),
        # Perfect and worst possible games reach the limits.
        (10, 10, 200, 4, 0, 158.3),
        (10, 0, 0, 0, 5, 0.0),
    ],
)
def test_passer_rating(att, cmp, yds, td, picks, expected):
    week = {"passAtt": att, "passCmp": cmp, "passYds": yds, "passTd": td, "int": picks}
    assert rollup(stat(PASSER_RATING, "rate", 1), [week]) == expected


def test_passer_rating_without_attempts():
    assert rollup(stat(PASSER_RATING, "rate", 1), [{"passAtt": 0}]) is None
