import typing as t
import fastapi
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.ext.asyncio import AsyncConnection


__all__ = ("AsyncConnectionDep", "AsyncEngineDep", "AsyncSessionDep")


def get_async_engine(request: fastapi.Request) -> AsyncEngine:
    """Get async sqlalchemy engine instance."""
    engine: t.Optional[AsyncEngine] = request.app.state.async_database_engine

    if engine is None:
        raise RuntimeError("Database engine was not initialized!")
    
    return engine


async def get_async_connection(request: fastapi.Request) -> t.AsyncIterator[AsyncConnection]:
    """Get async database connection instance."""
    engine = get_async_engine(request)

    async with engine.begin() as connection:
        yield connection
        await t.cast(AsyncConnection, connection).rollback()


async def get_async_session(request: fastapi.Request) -> t.AsyncIterator[AsyncSession]:
    """Get async sqlalchemy session instance."""
    engine = get_async_engine(request)
    session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with session_factory() as session:
        yield session
        await t.cast(AsyncSession, session).rollback()


AsyncEngineDep = fastapi.Depends(get_async_engine)
AsyncConnectionDep = fastapi.Depends(get_async_connection)
AsyncSessionDep = fastapi.Depends(get_async_session)


# Examples of how to use those dependencies:
#
# >>> class PersonCreationSchema(pydantic.BaseModel):
# ...    name: str
# ...    age: int
# ...    last_name: str = ""
# 
# >>> @router.post("/person", status_code=http_status.HTTP_201_CREATED)
# ... async def create_person_entity(
# ...    person: PersonCreationSchema,
# ...    session: AsyncSession = AsyncSessionDep  # < Session dependency
# ... ):
# ...     statement = Person.insert().returning(Person.id)
# ...     result = await session.execute(statement, person.dict())
# ...     await session.commit()



    
