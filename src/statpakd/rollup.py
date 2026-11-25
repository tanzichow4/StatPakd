"""Combine values from several weeks into one total. Mirrors web/src/lib/rollup.ts."""

from collections.abc import Sequence

from statpakd.models import CompositeRollup, RatioRollup, StatDef, StatMap


def _present(weeks: Sequence[StatMap], key: str) -> list[float]:
    return [v for week in weeks if (v := week.get(key)) is not None]


def _round(value: float, decimals: int) -> float | int:
    # Halves round up, as in the web app, not to the nearest even digit.
    factor = 10**decimals
    rounded = int(value * factor + (0.5 if value >= 0 else -0.5) + (1e-9 if value >= 0 else -1e-9))
    return rounded / factor if decimals else rounded


def rollup(stat: StatDef, weeks: Sequence[StatMap]) -> float | int | None:
    """One total for a stat over several weeks, following the stat's rollup rule."""
    rule = stat.rollup
    decimals = stat.decimals or 0
    # A rate that is None in every week that lists it does not apply, whatever its parts add up to.
    listed = [week[stat.key] for week in weeks if stat.key in week]
    if isinstance(rule, RatioRollup | CompositeRollup) and listed:
        if all(value is None for value in listed):
            return None
    if isinstance(rule, RatioRollup):
        num, den = _present(weeks, rule.num), _present(weeks, rule.den)
        if not num or not den:
            return None
        below = sum(den) if rule.min_den is None else max(sum(den), rule.min_den)
        if below == 0:
            return None
        return _round(sum(num) / below * (rule.scale or 1), decimals)
    if isinstance(rule, CompositeRollup):
        den = _present(weeks, rule.den)
        if not den or sum(den) == 0:
            return None
        total = 0.0
        for term in rule.terms:
            part = (sum(_present(weeks, term.num)) / sum(den) + term.offset) * term.factor
            total += min(rule.max, max(0.0, part))
        return _round(total * rule.scale, decimals)
    values = _present(weeks, stat.key)
    if not values:
        return None
    if rule is not None:
        return _round(sum(values) / len(values), decimals)
    total = round(sum(values), max(decimals, 6))
    return int(total) if total == int(total) else total
