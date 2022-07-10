"""Module defining base functionality for the models."""
from sqlalchemy.orm import declarative_base

__all__ = ['Base']

# declarative base class
Base = declarative_base()
