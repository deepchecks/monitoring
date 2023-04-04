# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Middlewares to be used in the application."""
import logging
import time

import watchtower
from fastapi import Depends
from pyinstrument import Profiler
from starlette.datastructures import MutableHeaders
from starlette.requests import Request
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from deepchecks_monitoring.exceptions import LicenseError
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.utils.auth import CurrentUser


class ProfilingMiddleware:
    """A middleware which allows to return a runtime profiling for given routes."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Middleware entrypoint."""
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        request = Request(scope, receive=receive)
        profiling = request.query_params.get("profile", False)
        if not profiling:
            return await self.app(scope, receive, send)

        profiler = Profiler()
        output_html = None

        async def wrapped_send(message: Message) -> None:
            nonlocal profiler
            nonlocal output_html
            # For start message, editing the response headers
            if message["type"] == "http.response.start":
                profiler.stop()
                profiler.print(show_all=True)
                output_html = profiler.output_html(timeline=True).encode()
                # This modifies the "message" Dict in place, which is used by the "send" function below
                response_headers = MutableHeaders(scope=message)
                response_headers["content-encoding"] = ""
                response_headers["content-length"] = str(len(output_html))
                response_headers["content-type"] = "text/html; charset=utf-8"
                await send(message)
            # The body is sent in a second message
            elif message["type"] == "http.response.body":
                message["body"] = output_html
                await send(message)
            else:
                await send(message)

        profiler.start()
        return await self.app(scope, receive, wrapped_send)


class SecurityAuditMiddleware:
    """Access audit middleware."""

    def __init__(
            self,
            app: ASGIApp,
            log_group_name: str = "deepchecks-access-audit",
            log_stream_name: str = "deepchecks-access-audit",
    ):
        h = watchtower.CloudWatchLogHandler(
            log_group_name=log_group_name,
            log_stream_name=log_stream_name,
        )
        h.setLevel(logging.INFO)
        self.logger = logging.getLogger("access-audit")
        self.logger.addHandler(h)
        self.app = app

    async def __call__(
            self,
            scope: Scope,
            receive: Receive,
            send: Send
    ):
        """Execute middleware."""
        from deepchecks_monitoring.utils import auth  # pylint: disable=import-outside-toplevel

        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        response_status_code = None

        async def wrapped_send(message: Message):
            nonlocal response_status_code
            if message["type"] == "http.response.start":
                response_status_code = message["status"]
            await send(message)

        start = time.time()
        await self.app(scope, receive, wrapped_send)
        end = time.time()

        info = {
            "duration": end - start,
            "client": scope["client"],
            "scheme": scope["scheme"],
            "http_version": scope["http_version"],
            "method": scope["method"],
            "path": scope["path"],
            "query_string": scope["query_string"],
            "status": response_status_code,
            "headers": {},
            "user": None,
            "access_token": None
        }

        for k, v in scope["headers"]:
            name = k.decode() if isinstance(k, bytes) else k
            value = v.decode() if isinstance(v, bytes) else v

            if name == "authorization":
                value = "bearer *****"

            info["headers"][name] = value

        state = scope.get("state")

        if state and isinstance(access_token := state.get("access_token"), auth.UserAccessToken):
            info["access_token"] = {
                "email": access_token.email,
                "is_admin": access_token.is_admin,
                "exp": access_token.exp,
            }

        if state and (user := state.get("user")):
            info["user"] = {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "is_admin": user.is_admin,
                "organization_id": user.organization_id,
            }

        self.logger.exception(info)


class NoCacheMiddleware:
    """Responsible for disabling cache from REST API endpoints."""

    def __init__(self, app):
        self.app = app

    async def __call__(
            self,
            scope: Scope,
            receive: Receive,
            send: Send
    ):
        """Execute middleware."""
        if scope["type"] != "http" or not scope["path"].startswith("/api/"):
            return await self.app(scope, receive, send)

        async def wrapped_send(message: Message):
            if message["type"] == "http.response.start":
                message["headers"].append((b"cache-control",  b"no-cache, stale-if-error=0"))

            await send(message)

        await self.app(scope, receive, wrapped_send)


class LicenseCheckDependency:
    """Dependency used to validate license."""

    async def __call__(
        self,
        request: Request,
        user: User = Depends(CurrentUser()),
    ):
        """Authenticate user.

        Parameters
        ----------
        request: Request
            http request instance
        """
        # TODO: implement license check, for open source all enterprise features are disabled.
        if request.app.state.settings.is_cloud is False:
            raise LicenseError("Need license to use this feature")
