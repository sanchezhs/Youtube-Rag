from logging import Logger
from pydantic_settings import BaseSettings

def print_settings(logger: Logger, settings: BaseSettings, title: str, sensitive_keys: set[str]):
    def mask_value(key: str, value):
        if any(s in key.lower() for s in sensitive_keys):
            return "**********"
        return value

    settings = settings.model_dump()

    logger.info(title)
    max_key_len = max(len(k) for k in settings)

    for k, v in settings.items():
        v = mask_value(k, v)
        logger.info(f"  {k.ljust(max_key_len)} : {v}")

