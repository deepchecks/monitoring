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
import typing as t

import pytest

from tests.common import Payload, TestAPI


@pytest.fixture()
def category_mistmatch_check(
    test_api: TestAPI,
    classification_model: Payload,
) -> Payload:
    result = test_api.create_check(
        model_id=classification_model["id"],
        check={
            "name": "Check",
            "config": {
                "class_name": "CategoryMismatchTrainTest",
                "params": {},
                "module_name": "deepchecks.tabular.checks"
            }
        }
    )
    return t.cast(Payload, result)


def test_dashboard_retrieval(test_api: TestAPI):
    dashboard = t.cast(Payload, test_api.fetch_dashboard())
    assert dashboard["id"] == 1
    assert len(dashboard["monitors"]) == 0


def test_monitor_addition_to_dashboard(
    test_api: TestAPI,
    category_mistmatch_check: Payload,  # pylint: disable=redefined-outer-name
):
    dashboard = t.cast(Payload, test_api.fetch_dashboard())
    assert dashboard == {"id": 1, "name": None, "monitors": []}

    monitor = test_api.create_monitor(check_id=category_mistmatch_check["id"])
    monitor = t.cast(Payload, monitor)

    test_api.update_monitor(monitor_id=monitor["id"], monitor={"dashboard_id": 1})
    dashboard = t.cast(Payload, test_api.fetch_dashboard())

    assert len(dashboard["monitors"]) == 1
    assert dashboard["monitors"][0]["id"] == monitor["id"]


def test_dashboard_removal(test_api: TestAPI):
    dashboard = t.cast(Payload, test_api.fetch_dashboard())
    test_api.delete_dashboard(dashboard["id"])


def test_dashboard_update(test_api: TestAPI):
    # NOTE: all needed assertions will be done by "test_api.update_dashboard"
    dashboard = t.cast(Payload, test_api.fetch_dashboard())
    test_api.update_dashboard(dashboard_id=dashboard["id"], dashboard={"name": "dashy"})
