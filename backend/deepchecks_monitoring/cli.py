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
import anyio
import click
import sqlalchemy as sa
import uvicorn
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from deepchecks_monitoring.bgtasks.actors import WorkerBootstrap
from deepchecks_monitoring.bgtasks.scheduler import AlertsScheduler, execute_alerts_scheduler
from deepchecks_monitoring.config import DatabaseSettings, Settings
from deepchecks_monitoring.logic.cache_functions import CacheFunctions
from deepchecks_monitoring.logic.cache_invalidation import CacheInvalidator
from deepchecks_monitoring.logic.data_ingestion import DataIngestionBackend
from deepchecks_monitoring.monitoring_utils import fetch_unused_monitoring_tables
from deepchecks_monitoring.public_models import Organization
from deepchecks_monitoring.public_models.base import Base
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.utils.other import generate_random_user, generate_test_user


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
def consume_data():
    """Run kafka data consumer."""
    async def consume():
        settings = Settings()  # type: ignore
        resources_provider = ResourcesProvider(settings)
        backend = DataIngestionBackend(settings, resources_provider)
        await backend.run_data_consumer()

    anyio.run(consume)


@cli.command()
def consume_invalidation():
    """Run kafka invalidation consumer."""
    async def consume():
        settings = Settings()  # type: ignore
        resources_provider = ResourcesProvider(settings)
        backend = CacheInvalidator(resources_provider, CacheFunctions(resources_provider.redis_client))
        await backend.run_invalidation_consumer()

    anyio.run(consume)


@cli.command()
@click.option("--random", default=True, help="Whether to generate a random user or the static test user")
def generate_user(random):
    """Generate a user record for debugging/development purpose."""
    async def fn():
        settings = Settings(echo_sql=False)  # type: ignore
        resources_provider = ResourcesProvider(settings)
        async with resources_provider.create_async_database_session() as s:
            if random:
                u = await generate_random_user(s, settings.auth_jwt_secret, with_org=True)
            else:
                u = await generate_test_user(s, settings.auth_jwt_secret, with_org=True)
            print(f"id:{u.id}, email:{u.email}, access_token:{u.access_token}")
            await s.commit()
    anyio.run(fn)


@cli.command()
@click.option(
    "--orgid",
    default="all",
    help=(
        "Name of an organization, schema of which to upgrade. "
        "Pass 'all' if you want to upgrade all organizations schemas"
    )
)
def upgrade_organizations_schemas(orgid: str):
    """Upgrade given organization schema."""

    async def fn():
        settings = Settings(echo_sql=False)  # type: ignore
        async with ResourcesProvider(settings) as rp:
            engine = rp.async_database_engine
            async with rp.create_async_database_session() as s:
                if orgid == "all":
                    q = sa.select(Organization)
                    organizations = (await s.scalars(q)).all()
                    for org in organizations:
                        await org.schema_builder.upgrade(engine)
                else:
                    q = sa.select(Organization).where(Organization.id == int(orgid))
                    org = await s.scalar(q)
                    if org is not None:
                        await org.schema_builder.upgrade(engine)
                    else:
                        raise RuntimeError("Did not find an organization with given name")

    anyio.run(fn)


@cli.command()
def run():
    """Run web server."""
    uvicorn.run("app:create_application", port=8000, log_level="info")


@cli.command()
def run_https():
    """Run app with local certificate."""
    uvicorn.run("app:create_application", port=8000, log_level="info", ssl_certfile="./cert.pem",
                ssl_keyfile="./key.pem")


@cli.command()
def run_alert_scheduler():
    """Run the alerts scheduler."""
    execute_alerts_scheduler(scheduler_implementation=AlertsScheduler)


@cli.command()
def run_worker():
    """Run the alerts actor."""
    WorkerBootstrap().bootstrap()


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
