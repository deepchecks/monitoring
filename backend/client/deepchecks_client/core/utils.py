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
import enum
import json
import typing as t
from datetime import datetime

import numpy as np
import pandas as pd
import pendulum as pdl
from jsonschema import validators
from requests import HTTPError, Response
from requests.exceptions import JSONDecodeError
from termcolor import cprint

__all__ = ['ColumnType', 'TaskType', 'DeepchecksColumns']


class TaskType(enum.Enum):
    """Enum containing supported task types."""

    REGRESSION = "regression"
    MULTICLASS = "multiclass"
    BINARY = "binary"
    VISION_CLASSIFICATION = "vision_classification"
    VISION_DETECTION = "vision_detection"

    @classmethod
    def values(cls):
        return [e.value for e in TaskType]


class ColumnType(enum.Enum):
    """Enum containing possible types of data."""

    NUMERIC = "numeric"
    INTEGER = "integer"
    CATEGORICAL = "categorical"
    BOOLEAN = "boolean"
    TEXT = "text"
    ARRAY_FLOAT = "array_float"
    ARRAY_FLOAT_2D = "array_float_2d"
    DATETIME = "datetime"

    @classmethod
    def values(cls):
        return [e.value for e in ColumnType]


class DeepchecksColumns(enum.Enum):
    """Enum of saved deepchecks columns."""

    SAMPLE_ID_COL = "_dc_sample_id"
    SAMPLE_TS_COL = "_dc_time"
    SAMPLE_LABEL_COL = "_dc_label"
    SAMPLE_PRED_PROBA_COL = "_dc_prediction_probabilities"
    SAMPLE_PRED_COL = "_dc_prediction"


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
            return obj.item()
        if isinstance(obj, np.ndarray):
            return cls.encode(obj.tolist())
        if isinstance(obj, dict):
            return {k: cls.encode(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return tuple(cls.encode(v) for v in obj)
        if pd.isna(obj):
            return None
        return obj


def parse_timestamp(timestamp: t.Union[int, datetime]) -> "pendulum.datetime.DateTime":
    """Parse timestamp to datetime object."""
    if isinstance(timestamp, int) or np.issubdtype(type(timestamp), np.integer):
        return pdl.from_timestamp(timestamp, pdl.local_timezone())
    elif isinstance(timestamp, datetime):
        # If no timezone in datetime, assumed to be UTC and converted to local timezone
        return pdl.instance(timestamp, pdl.local_timezone())
    else:
        raise ValueError(f'Not supported timestamp type: {type(timestamp)}')


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
    cprint(msg, "green", attrs=["bold"])
