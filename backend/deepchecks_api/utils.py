import logging
from functools import lru_cache


@lru_cache()
def get_logger(module_name):
    logger = logging.getLogger(module_name)
    logger.setLevel(logging.DEBUG)
    return logger
