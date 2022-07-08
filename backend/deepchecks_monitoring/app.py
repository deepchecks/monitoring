import typing as t
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.ext.asyncio import AsyncEngine

from deepchecks_monitoring.config import Settings
from deepchecks_monitoring.api.v1.router import router as v1_router


__all__ = ['create_application']


def create_application(settings: t.Optional[Settings] = None) -> FastAPI:
    settings = settings or Settings()  # type: ignore
    
    app = FastAPI(title="Deepchecks Monitoring", openapi_url="/api/v1/openapi.json")
    async_engine = create_database_engine(settings)
    
    app.state.settings = settings
    app.state.async_database_engine = async_engine
    
    app.include_router(v1_router)

    @app.on_event("startup")
    async def startup_event():
        print('start')
    
    return app


def create_database_engine(settings: Settings) -> AsyncEngine:
    return create_async_engine(str(settings.async_database_uri), echo=settings.echo_sql)