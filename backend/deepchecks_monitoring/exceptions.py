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
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError
from starlette.exceptions import HTTPException as StarletteHTTPException

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
    'Unauthorized',
    'PaymentRequired',
    'LicenseError',
    'error_to_dict'
]


def error_to_dict(error) -> t.Dict[str, t.Any]:
    """Transform http error into a dictionary."""
    if isinstance(error, BaseHTTPException):
        return error.to_dict()
    if isinstance(error, (HTTPException, StarletteHTTPException)):
        return {
            'error_message': error.detail,
            'additional_information': {}
        }
    if isinstance(error, RequestValidationError):
        return {
            'error_message': f'{error}'.replace('\n', ' ').replace('   ', ' '),
            'additional_information': {'errors': error.errors()}
        }
    raise TypeError(f'Unsupported error type - {type(error)}')


class BaseHTTPException(abc.ABC, HTTPException):
    """Base HTTP Exception."""

    default_message: t.ClassVar[t.Optional[str]] = None
    status_code: int

    def __init__(
        self,
        message: t.Optional[str] = None,
        additional_information: t.Optional[t.Dict[str, t.Any]] = None,
        headers: t.Optional[t.Dict[str, t.Any]] = None,
    ):
        super().__init__(self.status_code, message, headers)
        self.message = message or self.default_message
        self.additional_information = additional_information

        if not self.message:
            type_name = type(self).__name__
            raise ValueError(f'{type_name} message parameter cannot be empty')

    def to_dict(self):
        """Prepare a error dictionary."""
        return {
            'error_message': self.message,
            'additional_information': self.additional_information or {}
        }


class UnacceptedEULA(BaseHTTPException):
    """Exception which indicates that user did not accept EULA."""

    default_message = 'User must accept Deeppchecks End-User License Agreement to continue'
    status_code = status.HTTP_451_UNAVAILABLE_FOR_LEGAL_REASONS


class RedirectException(HTTPException):
    """Exception which creates a redirection."""

    def __init__(self, url):
        super().__init__(status.HTTP_307_TEMPORARY_REDIRECT, headers={'Location': url})


class InvalidConfigurationException(BaseHTTPException):
    """Exception which indicates user that is misconfigured."""

    status_code = status.HTTP_403_FORBIDDEN  # TODO: change status code

    def __init__(
        self,
        message: t.Optional[str] = None,
        additional_information: t.Optional[t.Dict[str, t.Any]] = None,
        headers: t.Optional[t.Dict[str, t.Any]] = None
    ):
        super().__init__(
            message=message,
            additional_information=additional_information,
            headers={**{'X-Substatus': '10'}, **headers} if headers else {'X-Substatus': '10'}
        )


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


class LicenseError(BaseHTTPException):
    """Trying to access enterprise feature without license."""

    # TODO: change status code, PaymentRequired also uses 402 status code
    status_code = status.HTTP_402_PAYMENT_REQUIRED


def is_unique_constraint_violation_error(error: IntegrityError) -> bool:
    """Verify whether this integrity error was caused by a unique constraint violation."""
    cause = getattr(error, 'orig', None)
    sqlstate = getattr(cause, 'sqlstate', None)
    return isinstance(cause, UniqueViolationError) or sqlstate == UniqueViolationError.sqlstate
