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
from pyinstrument import Profiler
from starlette.datastructures import MutableHeaders
from starlette.requests import Request
from starlette.types import ASGIApp, Message, Receive, Scope, Send


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
                output_html = profiler.output_html().encode()
                # This modifies the "message" Dict in place, which is used by the "send" function below
                response_headers = MutableHeaders(scope=message)
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
