# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
import typing as t

import pendulum as pdl
import pytest
from deepdiff import DeepDiff
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.config import Settings
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.schema_models import IngestionError, ModelVersion
from tests.common import Payload, TestAPI, generate_user
from tests.conftest import ROWS_PER_MINUTE_LIMIT


async def assert_ingestion_errors_count(num, session):
    count = (await session.execute(select(func.count()).select_from(IngestionError))).scalar()
    assert num == count


@pytest.mark.asyncio
async def test_log_data(
    test_api: TestAPI,
    classification_model_version: Payload,
    async_session: AsyncSession
):
    test_api.upload_samples(
        model_version_id=classification_model_version["id"],
        samples=[{
            "_dc_sample_id": "a000",
            "_dc_time": pdl.datetime(2020, 1, 1, 0, 0, 0).isoformat(),
            "_dc_prediction_probabilities": [0.1, 0.3, 0.6],
            "_dc_prediction": "2",
            "a": 11.1,
            "b": "ppppp",
        }]
    )
    await assert_ingestion_errors_count(0, async_session)


@pytest.mark.asyncio
async def test_log_data_without_index(
    test_api: TestAPI,
    classification_model_version: Payload,
    async_session: AsyncSession
):
    test_api.upload_samples(
        model_version_id=classification_model_version["id"],
        samples=[{
            "_dc_time": pdl.datetime(2020, 1, 1, 0, 0, 0).isoformat(),
            "_dc_prediction_probabilities": [0.1, 0.3, 0.6],
            "_dc_prediction": "2",
            "a": 11.1,
            "b": "ppppp",
        }]
    )
    await assert_ingestion_errors_count(1, async_session)


@pytest.mark.asyncio
async def test_log_data_missing_columns(
    test_api: TestAPI,
    classification_model_version: Payload,
    async_session: AsyncSession
):
    test_api.upload_samples(
        model_version_id=classification_model_version["id"],
        samples=[{
            "_dc_sample_id": "a000",
            "_dc_time": pdl.datetime(2020, 1, 1, 0, 0, 0).isoformat()
        }]
    )
    await assert_ingestion_errors_count(1, async_session)


@pytest.mark.asyncio
async def test_log_data_conflict(
    test_api: TestAPI,
    classification_model_version: Payload,
    async_session: AsyncSession
):
    # Arrange
    samples = [{
        "_dc_sample_id": "a000",
        "_dc_time": pdl.datetime(2020, 1, 1, 0, 0, 0).isoformat(),
        "_dc_prediction_probabilities": [0.1, 0.3, 0.6],
        "_dc_prediction": "2",
        "a": 11.1,
        "b": "ppppp",
    }]
    test_api.upload_samples(
        model_version_id=classification_model_version["id"],
        samples=samples
    )
    # Act - log existing index
    test_api.upload_samples(
        model_version_id=classification_model_version["id"],
        samples=samples
    )
    # Assert
    await assert_ingestion_errors_count(1, async_session)


@pytest.mark.asyncio
async def test_log_data_different_columns_in_samples(
    test_api: TestAPI,
    classification_model_version: Payload,
    async_session: AsyncSession
):
    test_api.upload_samples(
        model_version_id=classification_model_version["id"],
        samples=[
            {
                "_dc_sample_id": "a000",
                "_dc_time": pdl.datetime(2020, 1, 1, 0, 0, 0).isoformat(),
                "_dc_prediction_probabilities": [0.1, 0.3, 0.6],
                "_dc_prediction": "2",
                "a": 11.1,
                "b": "ppppp",
                "c": 11
            },
            {
                "_dc_sample_id": "a001",
                "_dc_time": pdl.datetime(2020, 1, 1, 10, 0, 0).isoformat(),
                "_dc_prediction_probabilities": [0.1, 0.3, 0.6],
                "_dc_prediction": "2",
                "a": 11.1,
                "b": "ppppp"
            }
        ]
    )
    await assert_ingestion_errors_count(0, async_session)


@pytest.mark.asyncio
async def test_samples_upload_with_integer_value_overflow(
    test_api: TestAPI,
    classification_model: Payload,
    async_session: AsyncSession
):
    version = t.cast(Payload, test_api.create_model_version(
        model_id=classification_model["id"],
        model_version={
            "name": "v1",
            "features": {"a": "integer", "b": "categorical"},
            "feature_importance": {"a": 0.1, "b": 0.5},
            "classes": ["0", "1", "2"]
        }
    ))
    test_api.upload_samples(
        model_version_id=version["id"],
        samples=[
            {
                "_dc_sample_id": "a000",
                "_dc_time": pdl.datetime(2020, 1, 1, 0, 0, 0).isoformat(),
                "_dc_prediction_probabilities": [0.1, 0.3, 0.6],
                "_dc_prediction": "2",
                "a": 2147483648,
                "b": "ppppp",
            },
            {
                "_dc_sample_id": "a001",
                "_dc_time": pdl.datetime(2020, 1, 1, 0, 0, 0).isoformat(),
                "_dc_prediction_probabilities": [0.1, 0.3, 0.6],
                "_dc_prediction": "2",
                "a": -2147483649,
                "b": "ppppp",
            },

        ]
    )
    await assert_ingestion_errors_count(2, async_session)


@pytest.mark.asyncio
async def test_log_labels(
    test_api: TestAPI,
    classification_model_version: Payload,
    classification_model: Payload,
    async_session: AsyncSession
):
    # Arrange
    test_api.upload_samples(
        model_version_id=classification_model_version["id"],
        samples=[{
            "_dc_sample_id": "a000",
            "_dc_time": pdl.datetime(2020, 1, 1, 0, 0, 0).isoformat(),
            "_dc_prediction_probabilities": [0.1, 0.3, 0.6],
            "_dc_prediction": "2",
            "a": 11.1,
            "b": "ppppp",
            "c": 11
        }]
    )
    # Act
    test_api.upload_labels(
        model_id=classification_model["id"],
        data=[{
            "_dc_sample_id": "a000",
            "_dc_label": "1",
        }]
    )
    # Assert
    await assert_ingestion_errors_count(0, async_session)


@pytest.mark.asyncio
async def test_log_labels_non_existing_samples(
    test_api: TestAPI,
    classification_model: Payload,
    async_session: AsyncSession
):
    # Arrange
    test_api.upload_labels(
        model_id=classification_model["id"],
        data=[{
            "_dc_sample_id": "not exists",
            "c": 0
        }]
    )
    # Assert
    await assert_ingestion_errors_count(0, async_session)


def test_send_reference_features(
    test_api: TestAPI,
    classification_model_version: Payload
):
    # Act
    test_api.upload_reference(
        model_version_id=classification_model_version["id"],
        data=[{
            "a": 11.1,
            "b": "ppppp",
            "_dc_prediction": "1",
            "_dc_prediction_probabilities": [0.1, 0.3, 0.6]
        }] * 100
    )


def test_send_reference_features_and_labels(
    test_api: TestAPI,
    classification_model_version: Payload
):
    # Act
    test_api.upload_reference(
        model_version_id=classification_model_version["id"],
        data=[{
            "_dc_label": "2",
            "a": 11.1,
            "b": "ppppp",
            "_dc_prediction": "1",
            "_dc_prediction_probabilities": [0.1, 0.3, 0.6]
        }] * 100
    )


def test_send_reference_balance_classes(
    test_api: TestAPI,
    classification_model_version: Payload
):
    # Assert balance classes on model version is false at start
    model_version = test_api.fetch_model_version(classification_model_version["id"])
    assert model_version["balance_classes"] is False
    # First upload single label
    test_api.upload_reference(
        model_version_id=classification_model_version["id"],
        data=[{
            "_dc_label": "2",
            "a": 11.1,
            "b": "ppppp",
            "_dc_prediction": "1",
            "_dc_prediction_probabilities": [0.1, 0.3, 0.6]
        }] * 100
    )
    # Upload reference with different labels
    test_api.upload_reference(
        model_version_id=classification_model_version["id"],
        data=[{
            "_dc_label": "0",
            "a": 11.1,
            "b": "ppppp",
            "_dc_prediction": "1",
            "_dc_prediction_probabilities": [0.1, 0.3, 0.6]
        }]
    )
    # Assert balance classes on model version was updated
    model_version = test_api.fetch_model_version(classification_model_version["id"])
    assert model_version["balance_classes"] is True


def test_send_reference_features_and_additional_data(
    test_api: TestAPI,
    classification_model_version: Payload
):
    # Act
    test_api.upload_reference(
        model_version_id=classification_model_version["id"],
        data=[{
            "a": 11.1, "b": "ppppp", "c": 42,
            "_dc_prediction": "1",
            "_dc_prediction_probabilities": [0.1, 0.3, 0.6]
        }] * 100
    )


@pytest.mark.skip(reason="takes a long time to run")
def test_send_reference_samples_exceed_limit(
    test_api: TestAPI,
    classification_model_version: Payload
):
    sample = {"a": 11.1, "b": "ppppp", "_dc_prediction": "1"}
    # Act
    test_api.upload_reference(
        model_version_id=classification_model_version["id"],
        data=[sample] * 100_000
    )
    response = test_api.upload_reference(
        model_version_id=classification_model_version["id"],
        data=[sample] * 10,
        expected_status=400
    )
    assert response.json() == {"detail": "Maximum allowed number of reference data samples is already uploaded"}


def test_send_reference_too_large(
    client: TestClient,
    classification_model_version: Payload
):
    # Act
    response = client.post(
        f"/api/v1/model-versions/{classification_model_version['id']}/reference",
        headers={"content-length": "500000001"}
    )
    # Assert
    assert response.status_code == 413


@pytest.mark.asyncio
async def test_statistics(
    test_api: TestAPI,
    classification_model_version: Payload,
    async_session: AsyncSession
):
    # Arrange
    samples = [
        {
            "_dc_sample_id": "1",
            "_dc_time": pdl.datetime(2020, 1, 1, 0, 0, 0).isoformat(),
            "_dc_prediction_probabilities": [0.1, 0.3, 0.6],
            "_dc_prediction": "2",
            "a": 11.1,
            "b": "cat",
        },
        {
            "_dc_sample_id": "2",
            "_dc_time": pdl.datetime(2020, 1, 3, 0, 0, 0).isoformat(),
            "_dc_prediction_probabilities": [0.1, 0.3, 0.6],
            "_dc_prediction": "2",
            "a": -1,
            "b": "something",
        },
        {
            "_dc_sample_id": "3",
            "_dc_time": pdl.datetime(2020, 1, 2, 0, 0, 0).isoformat(),
            "_dc_prediction_probabilities": [0.1, 0.3, 0.6],
            "_dc_prediction": "2",
            "a": 3,
            "b": "cat",
        }
    ]

    # Act
    test_api.upload_samples(
        model_version_id=classification_model_version["id"],
        samples=samples
    )

    # Assert
    model_version = await async_session.get(ModelVersion, classification_model_version["id"])
    diff = DeepDiff(model_version.statistics, {
        "a": {"max": 11.1, "min": -1},
        "b": {"values": ["something", "cat"]},
        "c": {"max": None, "min": None},
        "_dc_prediction": {"values": ["2"]},
        "_dc_time": {"max": pdl.datetime(2020, 1, 3, 0, 0, 0).timestamp(),
                     "min": pdl.datetime(2020, 1, 1, 0, 0, 0).timestamp()},
    }, ignore_order=True)

    assert not diff


@pytest.mark.asyncio
async def test_log_data_exceeding_rate(
    test_api: TestAPI,
    classification_model_version: Payload,
    regression_model_version: Payload,
    async_session: AsyncSession,
    user: User,
    settings: Settings,
):
    # == Arrange
    samples = [{
        "_dc_sample_id": str(i),
        "_dc_time": pdl.datetime(2020, 1, 1, 0, 0, 0).isoformat(),
        "_dc_prediction": "2",
        "a": 11.1,
        "b": "ppppp",
    } for i in range(ROWS_PER_MINUTE_LIMIT + 1)]

    # == Act
    response = test_api.upload_samples(
        model_version_id=classification_model_version["id"],
        samples=samples,
        expected_status=413
    )

    # == Assert
    assert response.json() == {
        "additional_information": {
            "num_saved": ROWS_PER_MINUTE_LIMIT,
        },
        "error_message": (
            f"Rate limit exceeded, you can send {ROWS_PER_MINUTE_LIMIT} rows per minute. "
            "5000 first rows were received"
        )
    }

    model_version = await async_session.get(ModelVersion, classification_model_version["id"])
    monitor_table = model_version.get_monitor_table(async_session)
    count = await async_session.scalar(select(func.count()).select_from(monitor_table))

    assert count == ROWS_PER_MINUTE_LIMIT

    # Test a second user in same organization is affected by it, on different model
    # == Arrange
    user = await generate_user(
        async_session,
        organization_id=user.organization_id,
        auth_jwt_secret=settings.auth_jwt_secret
    )

    with test_api.reauthorize(token=str(user.access_token)):
        # == Act
        response = test_api.upload_samples(
            model_version_id=regression_model_version["id"],
            samples=[{"_dc_sample_id": "1"}],
            expected_status=413
        )
        # == Assert
        assert response.json() == {
            "additional_information": {"num_saved": 0},
            "error_message": f"Rate limit exceeded, you can send {ROWS_PER_MINUTE_LIMIT} rows per minute"
        }
