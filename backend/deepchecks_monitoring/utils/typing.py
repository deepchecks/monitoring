"""Typing utils."""
# pylint: disable=unused-import
import typing as t

if t.TYPE_CHECKING:
    from datetime import datetime

    from pendulum.datetime import DateTime as PendulumDateTime

__all__ = ["as_pendulum_datetime", "as_datetime"]


def as_pendulum_datetime(value) -> "PendulumDateTime":
    return t.cast("PendulumDateTime", value)


def as_datetime(value) -> "datetime":
    return t.cast("datetime", value)
