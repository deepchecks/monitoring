# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
from tests.common import Payload, TestAPI, upload_classification_data


def test_tabular_classification_suite_with_ref(
    test_api: TestAPI,
    classification_model_version: Payload,
    classification_model: Payload,
):
    # Arrange
    test_api.upload_reference(
        model_version_id=classification_model_version["id"],
        data=[{"_dc_label": "2", "a": 11.1, "b": "ppppp", "_dc_prediction": "1"}] * 100
    )
    _, start_date, end_date = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        model_id=classification_model["id"]
    )
    # Act
    # NOTE: "test_api" will assert response status code
    test_api.execute_suite(
        model_version_id=classification_model_version["id"],
        options={"start_time": start_date.isoformat(), "end_time": end_date.isoformat()}
    )


def test_tabular_classification_suite_without_ref(
    test_api: TestAPI,
    classification_model_version: Payload,
    classification_model: Payload
):
    # Arrange
    _, start_date, end_date = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        model_id=classification_model["id"]
    )
    # Act
    # NOTE: "test_api" will assert response status code
    test_api.execute_suite(
        model_version_id=classification_model_version["id"],
        options={"start_time": start_date.isoformat(), "end_time": end_date.isoformat()}
    )
