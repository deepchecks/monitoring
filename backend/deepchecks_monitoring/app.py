# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the app."""
import asyncio
import logging
import typing as t

import deepchecks
import jsonschema.exceptions
from fastapi import APIRouter, FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.params import Depends
from fastapi.responses import JSONResponse, ORJSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from starlette.responses import FileResponse

from deepchecks_monitoring.api.v1.router import router as v1_router
from deepchecks_monitoring.config import Settings, tags_metadata
from deepchecks_monitoring.logic.cache_functions import CacheFunctions
from deepchecks_monitoring.logic.cache_invalidation import CacheInvalidator
from deepchecks_monitoring.logic.data_ingestion import DataIngestionBackend
from deepchecks_monitoring.middlewares import ProfilingMiddleware
from deepchecks_monitoring.resources import ResourcesProvider

__all__ = ["create_application"]


def create_application(
    title: str = "Deepchecks Monitoring",
    openapi_url: str = "/api/v1/openapi.json",
    root_path: str = "",
    settings: t.Optional[Settings] = None,
    additional_routers: t.Optional[t.Sequence[APIRouter]] = None,
    additional_dependencies: t.Optional[t.Sequence[Depends]] = None,
    routers_dependencies: t.Optional[t.Dict[str, t.Sequence[Depends]]] = None,
    resources_provider: t.Optional[ResourcesProvider] = None,
    data_ingestion_backend_class=DataIngestionBackend,
    cache_functions_class=CacheFunctions,
) -> FastAPI:
    """Create the application.

    Parameters
    ----------
    title: str
        application title
    openapi_url: str
        url to the endpoints specification file
    root_path: str
        url root path
    settings : Optional[Settings], default None
        settings for the application
    additional_routers : Optional[Sequence[APIRouter]] , default None
        list of additional routers to include
    additional_dependencies : Optional[Sequence[Depends]] , default None
        list of additional dependencies
    routers_dependencies
    resources_provider
    data_ingestion_backend_class
    cache_functions_class

    Returns
    -------
    FastAPI
        application instance
    """
    settings = settings or Settings()  # type: ignore

    app = FastAPI(
        title=title,
        openapi_url=openapi_url,
        root_path=root_path,
        dependencies=additional_dependencies,
        openapi_tags=tags_metadata,
        # Replace default json response, since it can't handle numeric nan/inf values
        default_response_class=ORJSONResponse
    )

    app.state.settings = settings
    app.state.resources_provider = resources_provider or ResourcesProvider(settings, cache_functions_class)
    app.state.cache_invalidator = CacheInvalidator(app.state.resources_provider)
    app.state.data_ingestion_backend = data_ingestion_backend_class(app.state.resources_provider,
                                                                    app.state.cache_invalidator)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "https://localhost:3000"],
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
        expose_headers=["x-substatus"],
    )

    routers_dependencies = routers_dependencies or {}
    app.include_router(v1_router, dependencies=routers_dependencies.get("v1") or [])

    if additional_routers is not None:
        for r in additional_routers:
            app.include_router(r)

    if settings.debug_mode:
        app.add_middleware(ProfilingMiddleware)

    @app.exception_handler(jsonschema.exceptions.ValidationError)
    async def _(_: Request, exc: jsonschema.exceptions.ValidationError):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": exc.message},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, exc: RequestValidationError):
        exc_str = f"{exc}".replace("\n", " ").replace("   ", " ")
        return JSONResponse(content={"message": exc_str}, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)

    @app.exception_handler(404)
    async def custom_404_handler(request: Request, exc):
        if request.url.path.startswith("/api/"):
            return PlainTextResponse(str(exc.detail), status_code=exc.status_code)
        else:
            # On not-existing route returns the index, and let the frontend handle the incorrect path.
            path = settings.assets_folder.absolute() / "index.html"
            if path.exists():
                return FileResponse(path)
            return PlainTextResponse(str(exc.detail), status_code=exc.status_code)

    app.mount("/", StaticFiles(directory=str(settings.assets_folder.absolute()), html=True))

    @app.on_event("startup")
    async def app_startup():
        if app.state.data_ingestion_backend.use_kafka:
            asyncio.create_task(app.state.data_ingestion_backend.run_data_consumer())
            asyncio.create_task(app.state.cache_invalidator.run_invalidation_consumer())

        # Add telemetry
        if settings.instrument_telemetry:
            FastAPIInstrumentor.instrument_app(app)

    # Set deepchecks testing library logging verbosity to error to not spam the logs
    deepchecks.set_verbosity(logging.ERROR)

    return app
