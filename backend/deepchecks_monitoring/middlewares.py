# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining middlewares of the application."""
import time

from starlette.types import ASGIApp, Message, Receive, Scope, Send


def _fill_user_and_token_from_state(info, state):
    from deepchecks_monitoring.utils import auth  # pylint: disable=import-outside-toplevel

    if state and isinstance(access_token := state.get("access_token"), auth.UserAccessToken):
        info["access_token"] = {
            "email": access_token.email,
            "is_admin": access_token.is_admin,
            "exp": access_token.exp,
        }

    # TODO: this creates DetachedInstanceError for some reason
    # if state and (user := state.get("user")):
    #     info["user"] = {
    #         "id": user.id,
    #         "full_name": user.full_name,
    #         "email": user.email,
    #         "organization_id": user.organization_id,
    #     }


class LoggingMiddleware:
    """logging middleware."""

    def __init__(
            self,
            app: ASGIApp,
            logger
    ):
        self.logger = logger
        self.app = app

    async def __call__(
            self,
            scope: Scope,
            receive: Receive,
            send: Send
    ):
        """Execute middleware."""
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        response_status_code = 0

        async def wrapped_send(message: Message):
            nonlocal response_status_code
            if message["type"] == "http.response.start":
                response_status_code = message["status"]
            await send(message)

        info = {
            "client": scope["client"],
            "scheme": scope["scheme"],
            "http_version": scope["http_version"],
            "method": scope["method"],
            "path": scope["path"],
            "query_string": scope["query_string"],
            "status": None,
            "headers": {},
            "user": None,
            "access_token": None
        }

        for k, v in scope["headers"]:
            name = k.decode() if isinstance(k, bytes) else k
            value = v.decode() if isinstance(v, bytes) else v

            if name.lower() != "cookie":
                info["headers"][name] = value

        start = time.time()
        try:
            await self.app(scope, receive, wrapped_send)
        # Any uncaught exception will be logged here
        except Exception:  # pylint: disable=broad-except
            end = time.time()
            _fill_user_and_token_from_state(info, scope.get("state"))
            info["duration"] = end - start
            self.logger.exception(info)
            # Raise back to allow Starlette to handle it
            raise
        else:
            end = time.time()
            _fill_user_and_token_from_state(info, scope.get("state"))
            info["duration"] = end - start
            info["status"] = response_status_code
            if response_status_code >= 500:
                self.logger.error(info)
            else:
                self.logger.info(info)
