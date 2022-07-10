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

import orjson
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import create_async_engine

from deepchecks_monitoring.api.v1.router import router as v1_router
from deepchecks_monitoring.config import Settings

__all__ = ["create_application"]


def create_application(settings: t.Optional[Settings] = None) -> FastAPI:
    """Create the application.

    Parameters
    ----------
    settings : Optional[Settings], default None
        settings for the application

    Returns
    -------
    FastAPI
        application instance
    """
    settings = settings or Settings()  # type: ignore

    async_engine = create_async_engine(str(settings.async_database_uri), echo=settings.echo_sql,
                                       json_serializer=json_serializer)
    app = FastAPI(title="Deepchecks Monitoring", openapi_url="/api/v1/openapi.json")

    app.state.settings = settings
    app.state.async_database_engine = async_engine

    app.include_router(v1_router)

    @app.on_event("startup")
    async def startup_event():
        print("start")

    return app


def json_serializer(obj):
    return orjson.dumps(obj).decode()
