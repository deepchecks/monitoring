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

import jsonschema.exceptions
from fastapi import APIRouter, FastAPI, Request, status
from fastapi.params import Depends
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import create_async_engine

from deepchecks_monitoring.api.v1.router import router as v1_router
from deepchecks_monitoring.config import Settings
from deepchecks_monitoring.utils import json_dumps

__all__ = ["create_application"]


def create_application(
    title: str = "Deepchecks Monitoring",
    openapi_url: str = "/api/v1/openapi.json",
    root_path: str = "",
    settings: t.Optional[Settings] = None,
    additional_routers: t.Optional[t.Sequence[APIRouter]] = None,
    additional_dependencies: t.Optional[t.Sequence[Depends]] = None,
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
    )

    app.state.settings = settings
    app.state.async_database_engine = create_async_engine(
        str(settings.async_database_uri),
        echo=settings.echo_sql,
        json_serializer=json_dumps
    )

    app.include_router(v1_router)

    if additional_routers is not None:
        for r in additional_routers:
            app.include_router(r)

    @app.exception_handler(jsonschema.exceptions.ValidationError)
    async def validation_error_handler(_: Request, exc: jsonschema.exceptions.ValidationError):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": exc.message},
        )

    @app.get("/")
    async def index():
        return RedirectResponse(url="/index.html")

    app.mount("/", StaticFiles(directory=str(settings.assets_folder.absolute())))

    return app
