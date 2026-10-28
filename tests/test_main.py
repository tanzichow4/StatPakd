import logging

from statpakd.main import main


def test_main_logs_greeting_with_env(monkeypatch, caplog):
    monkeypatch.setenv("APP_ENV", "testing")
    with caplog.at_level(logging.INFO):
        main()
    assert "Hello from statpakd (env=testing)" in caplog.text
