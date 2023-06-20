import pathlib

__all__ = ["uvicorn_loggers_config"]


def uvicorn_loggers_config(logs_storage: str | None = None):
    config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "()": "uvicorn.logging.DefaultFormatter",
                "fmt": "[%(process)d][%(asctime)s][%(levelname)s][%(name)s] %(message)s",
                "use_colors": None
            },
            "access": {
                "()": "uvicorn.logging.AccessFormatter",
                "fmt": "[%(process)d][%(asctime)s][%(levelname)s][%(name)s] %(message)s"
            }
        },
        "handlers": {
            "default-stream": {
                "formatter": "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stderr"
            },
            "access-stream": {
                "formatter": "access",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout"
            }
        },
        "loggers": {
            "uvicorn": {"handlers": ["default-stream"], "level": "INFO", "propagate": False},
            "uvicorn.error": {"level": "INFO"},
            "uvicorn.access": {"handlers": ["access-stream"], "level": "INFO", "propagate": False}
        }
    }

    if logs_storage:
        config["handlers"]["access-file"] = {
            "formatter": "access",
            "class": "logging.handlers.RotatingFileHandler",
            "mode": "a",
            "filename": str((pathlib.Path(logs_storage) / "deepchecks-http-access.log").absolute()),
            "maxBytes": 10000000,
            "backupCount": 3
        }
        config["handlers"]["errors"] = {
            "formatter": "access",
            "class": "logging.handlers.RotatingFileHandler",
            "mode": "a",
            "filename": str((pathlib.Path(logs_storage) / "deepchecks-errors.log").absolute()),
            "maxBytes": 10000000,
            "backupCount": 3,
            "level": "ERROR"
        }
        config["loggers"]["uvicorn.access"]["handlers"].append("access-file")
        config["loggers"]["uvicorn"]["handlers"].append("errors")

    return config
