import logging
import os

import uvicorn
from dotenv import load_dotenv

from statpakd.api import create_app
from statpakd.config import load_settings


def main() -> None:
    load_dotenv()
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
    log = logging.getLogger(__name__)
    log.info("Hello from statpakd (env=%s)", os.getenv("APP_ENV"))
    settings = load_settings()
    log.info("Data is cached in %s", settings.cache_dir)
    uvicorn.run(create_app(settings=settings), host=settings.host, port=settings.port)


if __name__ == "__main__":
    main()
