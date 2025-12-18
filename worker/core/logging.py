import logging
import sys
from typing import Optional

from core.config import settings


def setup_logging(level: Optional[str] = None) -> logging.Logger:
    log_level = level or ("DEBUG" if settings.debug else "INFO")

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    logger = logging.getLogger("yt_rag")
    logger.setLevel(log_level)
    logger.addHandler(handler)

    # Suppress noisy loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    return logger


logger = setup_logging()
