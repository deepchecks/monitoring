# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Util for creating a notebook."""
import io
import os
import pkgutil
import typing as t

import jupytext
import nbformat
from deepchecks.tabular import base_checks as tabular_base_checks
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.exceptions import BadRequest, NotFound
from deepchecks_monitoring.logic.check_logic import CheckNotebookSchema
from deepchecks_monitoring.logic.model_logic import get_model_versions_for_time_range, initialize_check
from deepchecks_monitoring.monitoring_utils import fetch_or_404
from deepchecks_monitoring.schema_models import Check

__all__ = ['get_check_notebook']


def _get_val_string(val):
    if isinstance(val, str):
        return '\'' + val + '\''
    return val


def _pretify_params(params: t.Dict[t.Any, t.Any]) -> str:
    param_list = [f'{key}={_get_val_string(val)}' for key, val in params.items()]
    return ', '.join(param_list)


async def get_check_notebook(
        check_id: int,
        notebook_options: CheckNotebookSchema,
        session: AsyncSession,
        host: str,
):
    """Run a check on a specified model version and returns a Jupyter notebook with the code to run the check.

    Parameters
    ----------
    check_id : int
        The id of the check to create a notebook to.
    notebook_options : CheckNotebookSchema
        The options for the check notebook.
    session : AsyncSession
        The database session to use.
    host : str
        The host of the DeepChecks server.

    Returns
    -------
    StreamingResponse
        A response containing the Jupyter notebook.
    """
    check: Check = await fetch_or_404(session, Check, id=check_id)
    model, model_versions = await get_model_versions_for_time_range(
        session, check.model_id, notebook_options.start_time_dt(), notebook_options.end_time_dt())

    if len(model_versions) == 0:
        raise NotFound('No relevant model version found')

    if notebook_options.model_version_id is not None:
        model_versions = list(filter(lambda model_version: model_version.id == notebook_options.model_version_id,
                                     model_versions))
        if len(model_versions) == 0:
            raise BadRequest('Specified invalid model version id.')

    model_version = model_versions[0]

    dp_check = initialize_check(check, model_version, notebook_options.additional_kwargs)
    check_config = dp_check.config(include_version=False, include_defaults=False)

    filters = str(notebook_options.filter.filters).replace('), ',
                                                           '),\n           ') if notebook_options.filter else None

    asset_name = 'run_single_check.md' if \
        isinstance(dp_check, tabular_base_checks.SingleDatasetBaseCheck) else 'run_train_test_check.md'

    path = os.path.join('utils', 'notebook_resources', asset_name)
    template = pkgutil.get_data('deepchecks_monitoring', path).decode('utf-8')
    template = template.format(host=host, model_name=model.name, model_version_name=model_version.name,
                               start_time=notebook_options.start_time_dt().isoformat(),
                               end_time=notebook_options.end_time_dt().isoformat(),
                               filters=filters,
                               check_module=check_config['module_name'], check_class=check_config['class_name'],
                               check_params=_pretify_params(check_config['params']))

    notebook_node = jupytext.reads(template, fmt='md')
    if notebook_options.as_script:
        response = PlainTextResponse(jupytext.writes(notebook_node, fmt='py:nomarker'))
    else:
        notebook_stream = io.StringIO()
        nbformat.write(notebook_node, notebook_stream)
        notebook_stream.seek(0)

        response = PlainTextResponse(notebook_stream.getvalue())

    return response
