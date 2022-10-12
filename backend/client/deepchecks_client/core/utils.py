# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
#
"""Module containing deepchecks monitoring client."""
import json
import typing as t
from datetime import datetime

import numpy as np
import pendulum as pdl
from jsonschema import validators
from requests import HTTPError, Response
from requests.exceptions import JSONDecodeError
from termcolor import cprint


def maybe_raise(
        response: Response,
        expected: t.Union[int, t.Tuple[int, int]] = (200, 299),
        msg: t.Optional[str] = None
) -> Response:
    """Verify response status and raise an HTTPError if got unexpected status code.

    Parameters
    ==========
    response : Response
        http response instance
    expected : Union[int, Tuple[int, int]] , default (200, 299)
        HTTP status code that is expected to receive 
    msg: Optional[str] , default None
        error message to show in case of unexpected status code,
        next template parameters available: 
        - status (HTTP status code)
        - reason (HTTP reason message)
        - url (request url)
        - body (response payload if available)
        - error (default error message that will include all previous parameters)

    Returns
    =======
    Response
    """
    status = response.status_code
    url = response.url
    reason = response.reason

    error_template = "Error: {status} {reason} url {url}.\nBody:\n{body}"
    client_error_template = "{status} Client Error: {reason} for url: {url}.\nBody:\n{body}"
    server_error_template = "{status} Server Internal Error: {reason} for url: {url}.\nBody:\n{body}"

    def select_template(status):
        if 400 <= status <= 499:
            return client_error_template
        elif 500 <= status <= 599:
            return server_error_template
        else:
            return error_template

    def process_body():
        try:
            return json.dumps(response.json(), indent=3)
        except JSONDecodeError:
            return

    if isinstance(expected, int) and status != expected:
        body = process_body()
        error = select_template(status).format(status=status, reason=reason, url=url, body=body)
        raise HTTPError(
            error
            if msg is None
            else msg.format(status=status, reason=reason, url=url, body=body, error=error)
        )

    if isinstance(expected, (tuple, list)) and not (expected[0] <= status <= expected[1]):
        body = process_body()
        error = select_template(status).format(status=status, reason=reason, url=url, body=body)
        raise HTTPError(
            error
            if msg is None
            else msg.format(status=status, reason=reason, url=url, body=body, error=error)
        )

    return response


class DeepchecksEncoder:

    @classmethod
    def encode(cls, obj):
        if isinstance(obj, np.generic):
            if np.isnan(obj):
                return None
            return obj.item()
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, dict):
            return {k: cls.encode(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return tuple([cls.encode(v) for v in obj])
        return obj


def parse_timestamp(timestamp):
    """Parse timestamp to datetime object."""
    if isinstance(timestamp, int):
        return pdl.from_timestamp(timestamp, pdl.local_timezone())
    elif isinstance(timestamp, datetime):
        # If no timezone in datetime, assumed to be UTC and converted to local timezone
        return pdl.instance(timestamp, pdl.local_timezone())
    else:
        raise Exception(f'Not supported timestamp type: {type(timestamp)}')


DeepchecksJsonValidator = validators.extend(
    validators.Draft202012Validator,
    type_checker=validators.Draft202012Validator.TYPE_CHECKER.redefine(
        "array",
        lambda _, instance: isinstance(instance, (list, tuple))
    )
)


def pretty_print(msg: str):
    """Pretty print the attached massage to the user terminal.

    Used for information massages which are not errors or warnings."""
    cprint(msg, "yellow", attrs=["bold"])
