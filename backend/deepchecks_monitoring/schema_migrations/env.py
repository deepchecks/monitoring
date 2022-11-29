# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Represent the env of the schema migration."""
import os
from contextlib import contextmanager
from logging.config import fileConfig

import sqlalchemy as sa
from alembic import context
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool

from deepchecks_monitoring.schema_models.base import Base as MonitoringBase

load_dotenv()


# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = MonitoringBase.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

if os.environ.get("DATABASE_URI"):
    config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URI"])


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    with database_connection() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()


@contextmanager
def database_connection():
    """Provide a database connection."""
    connectable = config.attributes.get("connection")
    if connectable:
        # we assume that desired schema search path is already applied
        # by whom passed connection to the attributes
        yield connectable
    else:
        schema = context.get_x_argument(as_dictionary=True).get("schema")
        schema = schema or os.environ.get("SCHEMA")
        connectable = engine_from_config(
            config.get_section(config.config_ini_section),
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )
        try:
            with connectable.connect() as c:
                if schema:
                    verify_schema_existence(c, schema)
                    c.execute(f"SET search_path TO {schema}")
                    c.dialect.default_schema_name = schema
                yield c
        finally:
            connectable.dispose()


def verify_schema_existence(connection, schema):
    """Verify that schema exists."""
    exists = connection.scalar(
        sa.text(
            "select exists ( "
                "select 1 "
                "from information_schema.schemata "
                "where schema_name = :schema_name "
            ")"
        ).bindparams(schema_name=schema)
    )

    if not exists:
        raise RuntimeError(f"Schema '{schema}' does not exist")


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
