# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the CLI of the monitoring package."""
import click
import sqlalchemy as sa
import uvicorn
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from deepchecks_monitoring.config import DatabaseSettings, Settings
from deepchecks_monitoring.models.base import Base
from deepchecks_monitoring.utils import fetch_unused_monitoring_tables


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


@cli.command()
def run():
    """Run web server."""
    uvicorn.run("app:create_application", port=5000, log_level="info")


@cli.command()
def schedule_alert_rules():
    """Run alert rules scheduler."""
    from .bgtasks.scheduler import AlertsScheduler  # pylint: disable=import-outside-toplevel
    from .bgtasks.scheduler import execute_alerts_scheduler  # pylint: disable=import-outside-toplevel
    execute_alerts_scheduler(scheduler_implementation=AlertsScheduler)


@cli.command()
def list_unused_monitoring_tables():
    """List unused monitoring tables."""
    settings = DatabaseSettings()  # type: ignore
    engine = create_engine(str(settings.database_uri), echo=True, future=True)

    with Session(bind=engine, future=True, autoflush=False) as s:
        tables = "\n- ".join(fetch_unused_monitoring_tables(s))
        print(f"Unused monitoring tables:\n- {tables}")

    engine.dispose()


@cli.command()
def drop_unused_monitoring_tables():
    """Drop unused monitoring tables."""
    settings = DatabaseSettings()  # type: ignore
    engine = create_engine(str(settings.database_uri), echo=True, future=True)

    with Session(bind=engine, future=True, autoflush=False) as s:
        tables = fetch_unused_monitoring_tables(s)

        for name in tables:
            s.execute(sa.text(f'DROP TABLE "{name}"'))

        s.commit()
        tables = "\n- ".join(tables)
        print(f"Next tables were dropped:\n- {tables}")

    engine.dispose()


if __name__ == "__main__":
    cli()
