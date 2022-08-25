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
import typing as t
from contextlib import asynccontextmanager

import jsonschema.exceptions
from fastapi import APIRouter, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.params import Depends
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pyinstrument import Profiler
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlalchemy.orm import sessionmaker

from deepchecks_monitoring.api.v1.router import router as v1_router
from deepchecks_monitoring.config import Settings, tags_metadata
from deepchecks_monitoring.utils import ExtendedAsyncSession, json_dumps

__all__ = ["create_application"]


class ResourcesProvider:
    """Provider of resources."""

    settings: Settings

    def __init__(self, settings: Settings):
        self.settings = settings
        self._async_database_engine: t.Optional[AsyncEngine] = None

    @property
    def async_database_engine(self) -> AsyncEngine:
        """Return async sqlalchemy database engine."""
        if self._async_database_engine:
            return self._async_database_engine
        self._async_database_engine = create_async_engine(
            str(self.settings.async_database_uri),
            echo=self.settings.echo_sql,
            json_serializer=json_dumps
        )
        return self._async_database_engine

    @asynccontextmanager
    async def create_async_database_session(self) -> t.AsyncIterator[ExtendedAsyncSession]:
        """Create async sqlalchemy database session."""
        session_factory = sessionmaker(
            self.async_database_engine,
            class_=ExtendedAsyncSession,
            expire_on_commit=False
        )
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception as error:
                await session.rollback()
                raise error
            finally:
                await session.close()


def create_application(
    title: str = "Deepchecks Monitoring",
    openapi_url: str = "/api/v1/openapi.json",
    root_path: str = "",
    settings: t.Optional[Settings] = None,
    resources_provider: t.Optional[ResourcesProvider] = None,
    additional_routers: t.Optional[t.Sequence[APIRouter]] = None,
    additional_dependencies: t.Optional[t.Sequence[Depends]] = None,
    routers_dependencies: t.Optional[t.Dict[str, t.Sequence[Depends]]] = None,
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
        openapi_tags=tags_metadata
    )

    app.state.settings = settings
    app.state.resources_provider = resources_provider or ResourcesProvider(settings)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
    )

    routers_dependencies = routers_dependencies or {}
    app.include_router(v1_router, dependencies=routers_dependencies.get("v1") or [])

    if additional_routers is not None:
        for r in additional_routers:
            app.include_router(r)

    if settings.debug_mode:
        @app.middleware("http")
        async def profile_request(request: Request, call_next):
            profiling = request.query_params.get("profile", False)
            if profiling:
                profiler = Profiler()
                profiler.start()
                await call_next(request)
                profiler.stop()
                return HTMLResponse(profiler.output_html())
            else:
                return await call_next(request)

    @app.exception_handler(jsonschema.exceptions.ValidationError)
    async def _(_: Request, exc: jsonschema.exceptions.ValidationError):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": exc.message},
        )

    @app.get("/")
    async def _():
        return RedirectResponse(url="/index.html")

    app.mount("/", StaticFiles(directory=str(settings.assets_folder.absolute())))

    return app
