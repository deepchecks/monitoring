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
import pytest
from deepchecks_client import DeepchecksClient, DeepchecksModelClient


def test_create_delete_model(deepchecks_sdk: DeepchecksClient):
    model = deepchecks_sdk.get_or_create_model(name='test_model', task_type='binary')
    model2 = deepchecks_sdk.get_or_create_model('test_model')
    assert model is model2

    # Delete
    deepchecks_sdk.delete_model('test_model')

    with pytest.raises(ValueError) as exc_info:
        deepchecks_sdk.get_model_version('test_model', 'ver1')
    assert exc_info.value.args[0] == 'Model with name test_model does not exist.'


def test_model_notes_functionality(deepchecks_sdk: DeepchecksClient):
    notes = [
        {'title': 'Super Important', 'text': 'How are you?'},
        {'title': 'Some Note', 'text': 'Bla Bla'}
    ]
    model = deepchecks_sdk.get_or_create_model(
        name='test_model',
        task_type='binary',
        model_notes=notes
    )

    model_notes = model.get_notes()
    assert len(model_notes) == len(notes)
    assert {it['title'] for it in model_notes} == {it['title'] for it in notes}
    assert {it['text'] for it in model_notes} == {it['text'] for it in notes}

    new_notes = [{'title': 'New Super Important Note', 'text': ''}]
    model.add_notes(new_notes)

    notes = [*new_notes, *notes]
    model_notes = model.get_notes()
    assert len(model_notes) == len(notes)
    assert {it['title'] for it in model_notes} == {it['title'] for it in notes}
    assert {it['text'] for it in model_notes} == {it['text'] for it in notes}


def test_create_alert_webhook(regression_model_client: DeepchecksModelClient):
    name = 'test_alert_webhook'
    url = 'https://www.google.com'
    http_method = 'GET'
    description = 'test alert webhook'
    http_headers = {'header1': 'value1', 'header2': 'value2'}
    notification_levels = ['critical', 'high']
    webhook_id = regression_model_client.add_alert_webhook(name=name, https_url=url, http_method=http_method,
                                                     description=description, http_headers=http_headers,
                                                     notification_levels=notification_levels)
    assert webhook_id is not None
    assert webhook_id == 1
