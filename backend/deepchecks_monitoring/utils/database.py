"""The database module."""
import contextlib
import logging
import typing as t

import asyncpg
import sqlalchemy as sa
from alembic import command, config
from sqlalchemy import event
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, AsyncSession
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session
from sqlalchemy.schema import CreateSchema, DDLElement

from deepchecks_monitoring.bgtasks import core as bgtasks_core

__all__ = ["SchemaBuilder", "attach_schema_switcher_listener", "attach_schema_switcher",
           "sqlalchemy_exception_to_asyncpg_exception"]


class SessionParameter(DDLElement):
    """Represents postgres session runtime parameter (SET <parameter> TO <value>).

    The SET command changes run-time configuration parameters.
    SET only affects the value used by the current session (connection).

    If SET (or equivalently SET SESSION) is issued within a transaction
    that is later aborted, the effects of the SET command disappear when
    the transaction is rolled back. Once the surrounding transaction is committed,
    the effects will persist until the end of the session, unless overridden
    by another SET.

    The effects of SET LOCAL last only till the end of the current transaction,
    whether committed or not.

    Source:
    - https://www.postgresql.org/docs/current/sql-set.html
    """

    inherit_cache = False

    def __init__(
            self,
            name: str,
            value: t.Union[str, int, float, t.Sequence[str]],
            local: bool = False,
    ):
        super().__init__()

        if isinstance(value, (str, int, float)):
            self.value = value
        elif isinstance(value, t.Sequence):
            self.value = ", ".join(f'"{it}"' for it in value)
        else:
            raise ValueError(f"Unsupported type of 'value' parameter - {type(value)}")

        self.name = name
        self.local = local


class ResetSessionParameter(DDLElement):
    """Represents postgres RESET <parameter> statement."""

    inherit_cache = False

    def __init__(self, name: str):
        super().__init__()
        self.name = name


@compiles(SessionParameter, "postgresql")
def visit_session_parameter(element: SessionParameter, *args, **kw) -> str:  # pylint: disable=unused-argument
    """Compile SessionParameter element."""
    n = element.name
    s = "" if not element.local else "LOCAL"
    v = element.value
    return f"SET {s} {n} TO {v}"


@compiles(ResetSessionParameter, "postgresql")
def visit_reset_session_parameter(
        element: ResetSessionParameter, *args, **kw) -> str:  # pylint: disable=unused-argument
    """Compile ResetSessionParameter element."""
    return f"RESET {element.name}"


async def attach_schema_switcher_listener(
        session: AsyncSession,
        schema_search_path: t.List[str]
):
    """Attach schema search path switcher listener."""
    pg_session_parameter = SessionParameter("search_path", local=True, value=schema_search_path)
    await session.execute(pg_session_parameter)

    @event.listens_for(session.sync_session, "after_begin")
    def schema_switcher(session: Session, *args, **kwargs):  # pylint: disable=unused-argument
        session.execute(pg_session_parameter)


@contextlib.asynccontextmanager
async def attach_schema_switcher(
        session: AsyncSession,
        schema_search_path: t.List[str]
):
    """Attach schema search path switcher listener."""
    pg_session_parameter = SessionParameter("search_path", local=True, value=schema_search_path)
    await session.execute(pg_session_parameter)

    @event.listens_for(session.sync_session, "after_begin")
    def schema_switcher(session: Session, *args, **kwargs):  # pylint: disable=unused-argument
        session.execute(pg_session_parameter)

    try:
        yield
    finally:
        event.remove(session.sync_session, "after_begin", schema_switcher)


class SchemaBuilder:
    """Postgres schema builder."""

    def __init__(
            self,
            name: str,
            *,
            metadata: t.Optional[sa.MetaData] = None,
            migrations_location: t.Optional[str] = None,
            logger: t.Optional[logging.Logger] = None
    ):
        if metadata and migrations_location:
            raise ValueError(
                "Only one of the next parameters could be "
                "applied: metadata, migrations_location"
            )
        if not metadata and not migrations_location:
            raise ValueError(
                "At least one of the next parameters must be "
                "applied: 'metadata', 'migrations_location'"
            )
        self.name = name
        self.metadata = metadata
        self.migrations_location = migrations_location
        self.logger = logger or logging.getLogger("schema-builder")

    async def create(self, engine: AsyncEngine):
        """Create schema."""
        if self.metadata is not None:
            args = (self.metadata.create_all,)
        elif self.migrations_location is not None:
            args = (self.do_upgrade, self.migrations_location)
        else:
            raise ValueError("")  # TODO

        async with engine.begin() as connection:
            try:
                await connection.execute(CreateSchema(name=self.name))
            except Exception as error:
                msg = "Failed to create organisation schema"
                self.logger.exception(f"{msg}. Org schema name: {self.name}")
                raise RuntimeError(msg) from error
            try:
                await connection.execute(SessionParameter(name="search_path", local=True, value=self.name))
                await connection.run_sync(*args)
                # TODO:
                # below statements should not be here
                # it should be done via migrations
                await connection.execute(bgtasks_core.PGTaskNotificationFunc)
                await connection.execute(bgtasks_core.PGTaskNotificationTrigger)
            except Exception as error:
                msg = "Failed to populate organisation schema with tables"
                self.logger.exception("%s. Org schema name: %s", msg, self.name)
                raise RuntimeError(msg) from error
            else:
                self.logger.info("Created org schema: %s", self.name)

    async def upgrade(self, engine: AsyncEngine):
        """Upgrade the schema."""
        if not self.migrations_location:
            raise RuntimeError(
                "In order to run 'upgrade' cmd you need to initialize 'SchemaBuilder' "
                "with 'migrations_location' parameter"
            )
        async with engine.begin() as connection:
            if not await self.does_schema_exist(connection, self.name):
                raise RuntimeError(f"Cannot run 'upgrade' cmd, schema '{self.name}' does not exist")
            try:
                await connection.execute(SessionParameter(name="search_path", local=True, value=self.name))
                await connection.run_sync(self.do_upgrade, self.migrations_location)
                # TODO: should be done via migrations
                await connection.execute(bgtasks_core.PGTaskNotificationFunc)
                await connection.execute(bgtasks_core.PGTaskNotificationTrigger)
            except Exception as error:
                msg = "Failed to populate upgrade schema"
                self.logger.exception("%s. Org schema name: %s", msg, self.name)
                raise RuntimeError(msg) from error
            else:
                self.logger.info("Upgraded org schema: %s", self.name)

    def do_upgrade(self, connection: Connection, migrations_location: str):
        """Upgrade the schema."""
        cfg = config.Config()
        cfg.set_main_option("script_location", migrations_location)
        cfg.attributes["connection"] = connection  # pylint: disable=unsupported-assignment-operation
        command.upgrade(cfg, "head")

    async def does_schema_exist(self, connection: AsyncConnection, schema: str):
        """Check if the schema exists."""
        return await connection.scalar(
            sa.text(
                "select exists ( "
                "select 1 "
                "from information_schema.schemata "
                "where schema_name = :schema_name "
                ")"
            ).bindparams(schema_name=schema)
        )


def sqlalchemy_exception_to_asyncpg_exception(exception: sa.exc.SQLAlchemyError) -> asyncpg.exceptions.PostgresError:
    """Convert sqlalchemy exception to asyncpg exception."""
    if hasattr(exception, "orig"):
        code = exception.orig.pgcode
        return asyncpg.exceptions.PostgresError.get_message_class_for_sqlstate(code)()
    return exception
