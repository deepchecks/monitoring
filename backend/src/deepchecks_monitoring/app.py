import fastapi
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy.ext.asyncio import create_async_engine

from deepchecks_monitoring.config import settings


def create_application() -> fastapi.FastAPI:
    app = fastapi.FastAPI(
        title="Deepchecks Monitoring", 
        openapi_url="api/v1/openapi.json"
    )

    # engine: Engine = create_engine(settings.DATABASE_URI, echo=True)
    # app.state.database_engine = engine
    
    async_engine: AsyncEngine = create_async_engine(settings.ASYNC_DATABASE_URI, echo=True)
    app.state.async_database_engine = async_engine
    app.state.config = settings

    # Set all CORS enabled origins
    # if settings.BACKEND_CORS_ORIGINS:
    #     app.add_middleware(
    #         CORSMiddleware,
    #         allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    #         allow_credentials=True,
    #         allow_methods=["*"],
    #         allow_headers=["*"],
    #     )

    # from deepchecks_api.endpoints.v1 import api as v1_api
    # app.include_router(v1_api.router)

    return app
