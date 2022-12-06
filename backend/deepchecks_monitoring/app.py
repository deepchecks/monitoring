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
from dataclasses import asdict

import deepchecks
import dotenv
import jsonschema.exceptions
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.params import Depends
from fastapi.responses import JSONResponse, ORJSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import FileResponse

from deepchecks_monitoring.api.v1 import global_router as v1_global_router
from deepchecks_monitoring.api.v1.router import router as v1_router
from deepchecks_monitoring.config import Settings, tags_metadata
from deepchecks_monitoring.exceptions import UnacceptedEULA
from deepchecks_monitoring.feature_flags import Variation
from deepchecks_monitoring.logic.data_ingestion import DataIngestionBackend
from deepchecks_monitoring.middlewares import ProfilingMiddleware, SecurityAuditMiddleware
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.utils import auth

__all__ = ["create_application"]


def create_application(
    title: str = "Deepchecks Monitoring",
    openapi_url: str = "/api/v1/openapi.json",
    root_path: str = "",
    settings: t.Optional[Settings] = None,
    resources_provider: t.Optional[ResourcesProvider] = None,
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
    resources_provider : Optional[ResourcesProvider], default None
        The resources provider object
    Returns
    -------
    FastAPI
        application instance
    """
    if path := dotenv.find_dotenv(usecwd=True):
        dotenv.load_dotenv(dotenv_path=path)

    settings = settings or Settings()

    # Configure telemetry with uptrace
    if settings.instrument_telemetry:
        import uptrace  # pylint: disable=import-outside-toplevel
        uptrace.configure_opentelemetry(
            service_name="monitoring-commercial",
            service_version="0.0.1",
            dsn=settings.uptrace_dsn
        )

    app = FastAPI(
        title=title,
        openapi_url=openapi_url,
        root_path=root_path,
        openapi_tags=tags_metadata,
        # Replace default json response, since it can't handle numeric nan/inf values
        default_response_class=ORJSONResponse
    )

    app.state.settings = settings
    app.state.resources_provider = resources_provider or ResourcesProvider(settings)
    app.state.data_ingestion_backend = DataIngestionBackend(app.state.resources_provider,
                                                            settings.get_deepchecks_bucket())
    app.state.feature_flags = {}
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "https://localhost:3000"],
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
        expose_headers=["x-substatus"],
    )

    app.include_router(v1_router, dependencies=[Depends(auth.CurrentActiveUser())])
    app.include_router(v1_global_router)

    if settings.debug_mode:
        app.add_middleware(ProfilingMiddleware)

    @app.exception_handler(jsonschema.exceptions.ValidationError)
    async def _(_: Request, exc: jsonschema.exceptions.ValidationError):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": exc.message},
        )

    @app.exception_handler(UnacceptedEULA)
    async def eula_exception_handler(*args, **kwargs):  # pylint: disable=unused-argument
        return JSONResponse(
            status_code=status.HTTP_451_UNAVAILABLE_FOR_LEGAL_REASONS,
            content={
                "message": "User must accept Deeppchecks End-User License Agreement to continue",
                "kind": "unaccepted-eula"
            }
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
            asyncio.create_task(app.state.data_ingestion_backend.cache_invalidator.run_invalidation_consumer())

        # Add telemetry
        if settings.instrument_telemetry:
            FastAPIInstrumentor.instrument_app(app)

    # Set deepchecks testing library logging verbosity to error to not spam the logs
    deepchecks.set_verbosity(logging.ERROR)

    @app.get("/feature-flags")
    def retrieve_feature_flags(_: Request) -> t.Dict[str, t.Union[bool, Variation[t.Any]]]:
        return {
            flag.name: asdict(flag) if isinstance(flag, Variation) else flag
            for flag in app.state.feature_flags.values()
            if flag.is_public is True
        }

    if settings.access_audit:
        app.add_middleware(SecurityAuditMiddleware)

    app.add_middleware(SessionMiddleware, secret_key=settings.auth_jwt_secret, same_site="none", https_only=True)

    return app
