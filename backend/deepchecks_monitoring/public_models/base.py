"""Represent the base public db models."""
import typing as t

from sqlalchemy import MetaData
from sqlalchemy.orm import declarative_base

from deepchecks_monitoring.public_models import BaseDeclarative

__all__ = ["Base"]

Base = t.cast(t.Any, declarative_base(cls=BaseDeclarative, metadata=MetaData(schema="public")))
