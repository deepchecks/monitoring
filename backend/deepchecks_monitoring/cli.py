"""Module defining the CLI of the monitoring package."""
import click
from sqlalchemy import create_engine
from deepchecks_monitoring.config import Settings
from deepchecks_monitoring.models.base import Base


@click.group()
def cli():
    """CLI for the deepchecks_monitoring package."""
    pass


@cli.command()
def initdb():
    """Initialize the database."""
    settings = Settings()  # type: ignore
    engine = create_engine(str(settings.database_uri), echo=True)
    Base.metadata.create_all(engine)
    engine.dispose()


if __name__ == '__main__':
    cli()
