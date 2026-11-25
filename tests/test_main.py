import logging

from statpakd import main as entry


def test_main_logs_greeting_with_env_and_starts_the_server(monkeypatch, caplog, tmp_path):
    served = []
    monkeypatch.setenv("APP_ENV", "testing")
    monkeypatch.setenv("STATPAKD_PORT", "8123")
    monkeypatch.setenv("STATPAKD_CACHE_DIR", str(tmp_path))
    monkeypatch.setattr(entry.uvicorn, "run", lambda app, **options: served.append(options))
    with caplog.at_level(logging.INFO):
        entry.main()
    assert "Hello from statpakd (env=testing)" in caplog.text
    assert served == [{"host": "127.0.0.1", "port": 8123}]
