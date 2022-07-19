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
import uvicorn
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


@cli.command()
def run():
    """Initialize the database."""
    uvicorn.run("app:create_application", port=5000, log_level="info")


if __name__ == "__main__":
    cli()
