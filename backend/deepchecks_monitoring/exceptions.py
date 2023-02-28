# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Exceptions."""
import abc
import typing as t

from asyncpg.exceptions import UniqueViolationError
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError

__all__ = [
    'UnacceptedEULA',
    'BaseHTTPException',
    'BadRequest',
    'NotFound',
    'InternalError',
    'ContentLengthRequired',
    'RequestTooLarge',
    'is_unique_constraint_violation_error',
    'AccessForbidden',
    'RedirectException',
    'InvalidConfigurationException',
    'Unauthorized'
]


class UnacceptedEULA(Exception):
    """Exception which indicates that user did not accept EULA."""

    def __init__(self, message: str = 'User did not accept EULA'):
        super().__init__(message)
        self.message = message


class BaseHTTPException(abc.ABC, HTTPException):
    """Base HTTP Exception."""

    status_code: int

    def __init__(
        self,
        message: str,
        headers: t.Optional[t.Dict[str, t.Any]] = None
    ):
        super().__init__(self.status_code, message, headers)
        self.message = message


class RedirectException(HTTPException):
    """Exception which creates a redirection."""

    def __init__(self, url):
        super().__init__(status.HTTP_307_TEMPORARY_REDIRECT, headers={'Location': url})


class InvalidConfigurationException(HTTPException):
    """Exception which indicates user that is misconfigured."""

    def __init__(self):
        super().__init__(status.HTTP_403_FORBIDDEN, headers={'X-Substatus': '10'})


class AccessForbidden(BaseHTTPException):
    """Access Forbidden exception."""

    status_code = status.HTTP_403_FORBIDDEN


class PaymentRequired(BaseHTTPException):
    """Payment Required exception."""

    status_code = status.HTTP_402_PAYMENT_REQUIRED


class Unauthorized(BaseHTTPException):
    """Unauthorized exception."""

    status_code = status.HTTP_401_UNAUTHORIZED


class BadRequest(BaseHTTPException):
    """Bad Request exception."""

    status_code = status.HTTP_400_BAD_REQUEST


class NotFound(BaseHTTPException):
    """Resource Not Found exception."""

    status_code = status.HTTP_404_NOT_FOUND


class InternalError(BaseHTTPException):
    """Internal Server Error exception."""

    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR


class ContentLengthRequired(BaseHTTPException):
    """Content-Length header value required exception."""

    status_code = status.HTTP_411_LENGTH_REQUIRED


class RequestTooLarge(BaseHTTPException):
    """Too Large Request exception."""

    status_code = status.HTTP_413_REQUEST_ENTITY_TOO_LARGE


def is_unique_constraint_violation_error(error: IntegrityError) -> bool:
    """Verify whether this integrity error was caused by a unique constraint violation."""
    cause = getattr(error, 'orig', None)
    sqlstate = getattr(cause, 'sqlstate', None)
    return isinstance(cause, UniqueViolationError) or sqlstate == UniqueViolationError.sqlstate
