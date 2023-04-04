import typing as t

import pytest
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from deepchecks_monitoring.schema_models.base import Base as MonitoringBase
from deepchecks_monitoring.utils.database import SchemaBuilder


@pytest.mark.asyncio
async def test_schema_builder_with_metadata(async_engine: AsyncEngine, async_session: AsyncSession):
    metadata = t.cast(sa.MetaData, MonitoringBase.metadata)
    builder = SchemaBuilder("test_schema", metadata=metadata)

    await builder.create(async_engine)

    tables = (await async_session.execute(
        sa.text(
            "SELECT schemaname, tablename "
            "FROM pg_catalog.pg_tables pt "
            "WHERE schemaname = :name "
        ).bindparams(name="test_schema")
    )).all()

    assert len(tables) > 0
    assert {it.schemaname for it in tables} == {"test_schema"}
    assert set(metadata.tables.keys()) == set(it.tablename for it in tables)


@pytest.mark.asyncio
async def test_schema_builder_with_migrations(async_engine: AsyncEngine, async_session: AsyncSession):
    monitoring_metadata = t.cast(sa.MetaData, MonitoringBase.metadata)
    builder = SchemaBuilder("test_schema", migrations_location="deepchecks_monitoring:schema_migrations")

    await builder.create(async_engine)

    tables = (await async_session.execute(
        sa.text(
            "SELECT schemaname, tablename "
            "FROM pg_catalog.pg_tables pt "
            "WHERE schemaname = :name "
        ).bindparams(name="test_schema")
    )).all()

    assert len(tables) > 0
    assert {it.schemaname for it in tables} == {"test_schema"}

    created_tables = set(it.tablename for it in tables if it.tablename != "alembic_version")
    expected_tables = set(monitoring_metadata.tables.keys())

    assert expected_tables == created_tables


@pytest.mark.asyncio
async def test_schema_upgrade(async_engine: AsyncEngine, async_session: AsyncSession):
    async with async_engine.begin() as c:
        await c.execute(sa.text("CREATE SCHEMA test_schema"))

    builder = SchemaBuilder("test_schema", migrations_location="deepchecks_monitoring:schema_migrations")
    monitoring_metadata = t.cast(sa.MetaData, MonitoringBase.metadata)

    await builder.upgrade(async_engine)

    tables = (await async_session.execute(
        sa.text(
            "SELECT schemaname, tablename "
            "FROM pg_catalog.pg_tables pt "
            "WHERE schemaname = :name "
        ).bindparams(name="test_schema")
    )).all()

    assert len(tables) > 0
    assert {it.schemaname for it in tables} == {"test_schema"}

    created_tables = set(it.tablename for it in tables if it.tablename != "alembic_version")
    expected_tables = set(monitoring_metadata.tables.keys())

    assert expected_tables == created_tables
