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
import dotenv
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.params import Depends
from fastapi.responses import JSONResponse, ORJSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import FileResponse

from deepchecks_monitoring.api.v1 import global_router as v1_global_router
from deepchecks_monitoring.api.v1.router import router as v1_router
from deepchecks_monitoring.config import tags_metadata
from deepchecks_monitoring.ee.middlewares import LicenseCheckDependency
from deepchecks_monitoring.exceptions import BaseHTTPException, error_to_dict
from deepchecks_monitoring.logic.data_ingestion import DataIngestionBackend
from deepchecks_monitoring.utils import auth

__all__ = ["create_application"]

try:
    from deepchecks_monitoring.ee.config import Settings
    from deepchecks_monitoring.ee.resources import ResourcesProvider
except ImportError:
    from deepchecks_monitoring.config import Settings
    from deepchecks_monitoring.resources import ResourcesProvider


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
    app.state.data_ingestion_backend = DataIngestionBackend(app.state.resources_provider)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "https://localhost:3000"],
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
        expose_headers=["x-substatus"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    app.include_router(v1_router, dependencies=[Depends(auth.CurrentActiveUser())])
    app.include_router(v1_global_router)

    @app.exception_handler(BaseHTTPException)
    async def base_http_exceptions_handler(
        request: Request,
        error: BaseHTTPException
    ):  # pylint: disable=unused-argument
        return JSONResponse(
            status_code=error.status_code,
            headers=error.headers,
            content=error_to_dict(error)
        )

    @app.exception_handler(HTTPException)
    async def fastapi_http_exceptions_handler(
        request: Request,
        error: HTTPException
    ):  # pylint: disable=unused-argument
        return JSONResponse(
            status_code=error.status_code,
            headers=error.headers,
            content=error_to_dict(error)
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, error: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_to_dict(error)
        )

    @app.exception_handler(404)
    async def custom_404_handler(request: Request, error: HTTPException):
        error_response = JSONResponse(
            status_code=error.status_code,
            content=error_to_dict(error)
        )

        if request.url.path.startswith("/api/"):
            return error_response

        # On not-existing route returns the index, and let the frontend handle the incorrect path.
        if (path := settings.assets_folder.absolute() / "index.html").exists():
            return FileResponse(path)

        return error_response

    @app.on_event("startup")
    async def app_startup():
        if app.state.data_ingestion_backend.use_kafka:
            app.state.ingestion_task = asyncio.create_task(app.state.data_ingestion_backend.run_data_consumer())

            def auto_removal(task):  # pylint: disable=unused-argument
                app.state.ingestion_task = None

            app.state.ingestion_task.add_done_callback(auto_removal)

    # Set deepchecks testing library logging verbosity to error to not spam the logs
    deepchecks.set_verbosity(logging.ERROR)

    # Add stuff available only in the enterprise version
    try:
        from deepchecks_monitoring import ee  # pylint: disable=import-outside-toplevel
    except ImportError:
        pass
    else:
        app.include_router(ee.api.v1.ee_router, dependencies=[Depends(LicenseCheckDependency())])

        if settings.is_cloud:
            app.include_router(ee.api.v1.cloud_router, dependencies=[Depends(LicenseCheckDependency())])

        # Configure telemetry
        if settings.sentry_dsn:
            import sentry_sdk  # pylint: disable=import-outside-toplevel

            sentry_sdk.init(
                dsn=settings.sentry_dsn,
                traces_sampler=ee.utils.sentry.traces_sampler,
                environment=settings.sentry_env,
                before_send_transaction=ee.utils.sentry.sentry_send_hook
            )
            # Ignoring this logger since it can spam sentry with errors
            sentry_sdk.integrations.logging.ignore_logger("aiokafka.cluster")
            ee.utils.telemetry.collect_telemetry(DataIngestionBackend)

        if settings.stripe_api_key:
            import stripe  # pylint: disable=import-outside-toplevel
            stripe.api_key = settings.stripe_api_key

        if settings.debug_mode:
            app.add_middleware(ee.middlewares.ProfilingMiddleware)

        if settings.access_audit:
            app.add_middleware(ee.middlewares.SecurityAuditMiddleware)

        app.add_middleware(SessionMiddleware, secret_key=settings.auth_jwt_secret, same_site="none", https_only=True)
        app.add_middleware(ee.middlewares.NoCacheMiddleware)

    # IMPORTANT: This must be the last router to be included
    app.mount("/", StaticFiles(directory=str(settings.assets_folder.absolute()), html=True))

    # AIOKafka is spamming our logs, disable it for errors and warnings
    logging.getLogger("aiokafka.cluster").setLevel(logging.CRITICAL)

    return app
