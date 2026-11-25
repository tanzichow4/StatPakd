import os
import time

import polars as pl
import pytest

from statpakd.nfl.source import DataUnavailable, DiskCache

OLD = pl.DataFrame({"v": [1]})
NEW = pl.DataFrame({"v": [2]})


def offline():
    raise ConnectionError("offline")


def age(path, seconds):
    then = time.time() - seconds
    os.utime(path, (then, then))


def test_downloads_once_while_fresh(tmp_path):
    cache = DiskCache(tmp_path, max_age=60)
    assert cache.get("t", lambda: OLD).equals(OLD)
    assert cache.get("t", offline).equals(OLD)


def test_downloads_again_when_stale(tmp_path):
    cache = DiskCache(tmp_path, max_age=60)
    cache.get("t", lambda: OLD)
    age(tmp_path / "t.parquet", 120)
    assert cache.get("t", lambda: NEW).equals(NEW)


def test_uses_the_saved_copy_when_a_refresh_fails(tmp_path):
    cache = DiskCache(tmp_path, max_age=60)
    cache.get("t", lambda: OLD)
    age(tmp_path / "t.parquet", 120)
    assert cache.get("t", offline).equals(OLD)


def test_fails_clearly_without_a_saved_copy(tmp_path):
    with pytest.raises(DataUnavailable, match="Could not download t"):
        DiskCache(tmp_path, max_age=60).get("t", offline)


def test_leaves_no_temporary_files(tmp_path):
    DiskCache(tmp_path / "nested", max_age=60).get("t", lambda: OLD)
    assert [p.name for p in (tmp_path / "nested").iterdir()] == ["t.parquet"]
