import contextlib
import random
import string
import typing as t

import faker
import httpx
import pandas as pd
import pendulum as pdl
import sqlalchemy as sa
from deepchecks.tabular.checks import SingleDatasetPerformance
from deepchecks_client.core.api import API
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from deepchecks_monitoring.monitoring_utils import OperatorsEnum, TimeUnit
from deepchecks_monitoring.public_models import Organization, User, UserOAuthDTO
from deepchecks_monitoring.public_models.billing import Billing
from deepchecks_monitoring.schema_models import Alert, AlertSeverity, ColumnType, TaskType
from deepchecks_monitoring.schema_models.monitor import Frequency
from deepchecks_monitoring.utils.database import attach_schema_switcher_listener

if t.TYPE_CHECKING:
    from pendulum.datetime import DateTime as PendulumDateTime  # pylint: disable=unused-import

__all__ = ["generate_user", "DataGenerator", "TestAPI", "create_alert", "upload_classification_data", "Payload"]


async def generate_user(
    session: AsyncSession,
    auth_jwt_secret: str,
    with_org: bool = True,
    switch_schema: bool = False,
    eula: bool = True,
    organization_id=None
) -> User:
    f = faker.Faker()

    u = await User.from_oauth_info(
        info=UserOAuthDTO(email=f.email(), name=f.name()),
        session=session,
        auth_jwt_secret=auth_jwt_secret,
        eula=eula
    )

    session.add(u)
    org = None

    if with_org:
        if organization_id:
            u.organization_id = organization_id
            await session.commit()
            await session.refresh(u)
        else:
            org = await Organization.create_for_user(owner=u, name=f.name(),)
            await org.schema_builder.create(AsyncEngine(session.get_bind()))
            org.email_notification_levels = list(AlertSeverity)
            org.slack_notification_levels = list(AlertSeverity)
            session.add(org)
            await session.commit()
            await session.refresh(u)
            await session.refresh(org)
            await session.execute(sa.insert(Billing).values(bought_models=8, organization_id=u.organization_id))
            await session.commit()
    else:
        await session.commit()
        await session.refresh(u)

    if switch_schema and org:
        await attach_schema_switcher_listener(
            session=session,
            schema_search_path=[t.cast(str, org.schema_name), "public"]
        )

    return u

# TODO: use deepchecks client for this


class DataGenerator:
    """Data and domain entities generation utility."""

    def __init__(self):
        self.faker = faker.Faker()

    def generate_random_condition(self, numeric=False) -> "Payload":
        if numeric:
            options = [OperatorsEnum.EQ, OperatorsEnum.GE, OperatorsEnum.GT, OperatorsEnum.LT, OperatorsEnum.LE]
        else:
            options = [OperatorsEnum.EQ, OperatorsEnum.IN]

        return {
            "operator": random.choice(options).value,
            "value": random.randint(-10, 10)
        }

    def generate_random_model(self) -> "Payload":
        return {
            "name": self.faker.name(),
            "task_type": random.choice(list(TaskType)).value,
            "description": self.faker.text(),
            "alerts_delay_labels_ratio": 0,
            "alerts_delay_seconds": 0
        }

    def generate_random_check(self) -> "Payload":
        return {
            "name": self.faker.name(),
            "config": SingleDatasetPerformance().config(include_version=False)  # TODO:
        }

    def generate_random_monitor(self) -> "Payload":
        frequency = random.choice(list(Frequency))
        aggregation_window = random.choice([1, 2, 3])
        return {
            "name": self.faker.name(),
            "lookback": random.choice([TimeUnit.WEEK, TimeUnit.WEEK * 2, TimeUnit.WEEK * 3]),
            "description": self.faker.text(),
            "dashboard_id": None,
            "data_filters": None,  # TODO:
            "additional_kwargs": None,
            "aggregation_window": aggregation_window,
            "frequency": frequency.value,
        }

    def generate_random_alert_rule(self) -> "Payload":
        return {
            "condition": self.generate_random_condition(numeric=True),
            "alert_severity": random.choice(["low", "medium", "high", "critical"]),
            "is_active": True
        }

    def generate_random_features(self, n_of_features):
        column_types = [
            ColumnType.BOOLEAN,
            ColumnType.CATEGORICAL,
            ColumnType.NUMERIC,
            ColumnType.TEXT,
            ColumnType.INTEGER,
        ]
        return dict(
            (
                random_string(),
                random.choice(column_types)
            )
            for _ in range(n_of_features)
        )

    def generate_random_standart_webhook(self):
        return {
            "kind": "STANDART",
            "name": self.faker.name(),
            "description": self.faker.text(),
            "http_url": "https://httpbin.org",
            "http_method": random.choice(["GET", "POST"]),
            "http_headers": {"X-value": "Hello world"},
            "notification_levels": [
                random.choice(list(AlertSeverity)).value
                for _ in range(len(AlertSeverity))
            ],
        }

    def generate_random_model_note(self):
        return {
            "title": "Note Title",
            "text": self.faker.text(),
        }


class ExpectedHttpStatus:
    """Utility class to assert response status."""

    @classmethod
    def create(cls, expected_status: "ExpectedStatus"):
        return (
            expected_status
            if isinstance(expected_status, ExpectedHttpStatus)
            else cls(expected_status)
        )

    def __init__(
        self,
        status: t.Union[t.Tuple[int, int], int] = (200, 299)
    ):
        if isinstance(status, int):
            self.left = status
            self.right = status

        elif isinstance(status, (tuple, list)):
            if len(status) != 2:
                raise ValueError("Incorrect http status")

            l, r = status

            if l > r:
                raise ValueError("Incorrect http status")
            if l < 100 or r > 599:
                raise ValueError("Incorrect http status")

            self.left = l
            self.right = r

        else:
            raise TypeError(
                f"Unexpected type of http status - {type(status)}"
            )

    def assert_response_status(self, response: httpx.Response) -> httpx.Response:
        r = self.left <= response.status_code <= self.right
        assert r, (response.reason_phrase, response.status_code, response.text)
        return response

    def is_positive(self) -> bool:
        return self.left >= 200 and self.right <= 299

    def is_negative(self) -> bool:
        return not self.is_positive()


ExpectedStatus = t.Union[int, t.Tuple[int, int], ExpectedHttpStatus]
Payload = t.Dict[str, t.Any]


class ModelIdentifiersPair(t.TypedDict):
    """Represents a model identifier choose."""

    id: int
    name: str


class TestAPI:
    """Utility class to test HTTP API."""

    def __init__(self, api: API):
        self.api = api
        self.data_generator = DataGenerator()

    @contextlib.contextmanager
    def reauthorize(self, token: str):
        current_token = self.api.session.headers["Authorization"]
        self.api.session.headers["Authorization"] = f"Bearer {token}"
        yield self
        self.api.session.headers["Authorization"] = current_token

    def create_model(
        self,
        model: t.Optional[Payload] = None,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        generated_payload = self.data_generator.generate_random_model()

        model = (
            {**generated_payload, **model}
            if model is not None
            else generated_payload
        )

        response = self.api.create_model(model, raise_on_status=False)
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, dict)
        assert "id" in data

        return self.fetch_model(data["id"])

    def delete_model(
        self,
        model_identifier: t.Union[str, int, ModelIdentifiersPair],
        identifier_kind: str = "by-id",
        expected_status: ExpectedStatus = (200, 299)
    ):
        if identifier_kind == "by-id":
            identifier = (
                t.cast(int, model_identifier)
                if not isinstance(model_identifier, dict)
                else model_identifier["id"]
            )
            response = self.api.delete_model_by_id(identifier, raise_on_status=False)
        elif identifier_kind == "by-name":
            name = t.cast(str, model_identifier) if not isinstance(model_identifier, dict) else model_identifier["name"]
            response = self.api.delete_model_by_name(name, raise_on_status=False)
        else:
            raise ValueError("Unknown identifier_kind value")

        response = t.cast(httpx.Response, response)
        expected_status = ExpectedHttpStatus.create(expected_status)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        self.fetch_model(
            model_identifier=model_identifier,
            identifier_kind=identifier_kind,
            expected_status=404
        )

    def fetch_model(
        self,
        model_identifier: t.Union[str, int, ModelIdentifiersPair],
        identifier_kind: str = "by-id",
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        if identifier_kind == "by-id":
            identifier = (
                int(model_identifier)
                if not isinstance(model_identifier, dict)
                else model_identifier["id"]
            )
            response = self.api.fetch_model_by_id(identifier, raise_on_status=False)
        elif identifier_kind == "by-name":
            name = str(model_identifier) if not isinstance(model_identifier, dict) else model_identifier["name"]
            response = self.api.fetch_model_by_name(name, raise_on_status=False)
        else:
            raise ValueError("Unknown identifier_kind value")

        response = t.cast(httpx.Response, response)
        expected_status = ExpectedHttpStatus.create(expected_status)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        return self.assert_model_record(response.json())

    def fetch_available_models(
        self,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, t.List[Payload]]:
        response = self.api.session.get("available-models")
        response = t.cast(httpx.Response, response)
        expected_status = ExpectedHttpStatus.create(expected_status)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, list)

        for it in data:
            assert isinstance(it, dict)
            assert isinstance(it["id"], int)
            assert isinstance(it["name"], str)
            assert isinstance(it["alerts_count"], int)
            assert isinstance(it["monitors_count"], int)
            assert isinstance(it["latest_time"], (int, type(None)))
            assert isinstance(it["description"], (str, type(None)))
            assert isinstance(it["task_type"], (str, type(None)))
            assert isinstance(it["has_data"], bool)
            assert isinstance(it["versions"], list)
            assert isinstance(it["max_severity"], (str, type(None)))

        return data

    @classmethod
    def assert_model_record(cls, data) -> Payload:
        assert isinstance(data, dict)
        assert "id" in data and isinstance(data["id"], int)
        assert "name" in data and isinstance(data["name"], str)
        assert "task_type" in data
        assert "description" in data
        return data

    def fetch_model_columns(
        self,
        model_identifier: t.Union[str, int, ModelIdentifiersPair],
        identifier_kind: str = "by-id",
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        if identifier_kind == "by-id":
            identifier = (
                int(model_identifier)
                if not isinstance(model_identifier, dict)
                else model_identifier["id"]
            )
            response = self.api.session.get(f"models/{identifier}/columns")
        elif identifier_kind == "by-name":
            name = str(model_identifier) if not isinstance(model_identifier, dict) else model_identifier["name"]
            response = self.api.session.get(f"models/{name}/columns", params={"identifier_kind": "name"})
        else:
            raise ValueError("Unknown identifier_kind value")

        response = t.cast(httpx.Response, response)
        expected_status = ExpectedHttpStatus.create(expected_status)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, dict)

        for v in data.values():
            assert isinstance(v, dict)
            assert "type" in v
            assert "stats" in v

        return data

    def fetch_model_notes(
        self,
        model_id: int,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, t.List[Payload]]:
        response = self.api.fetch_model_notes(model_id=model_id, raise_on_status=False)
        response = t.cast(httpx.Response, response)
        expected_status = ExpectedHttpStatus.create(expected_status)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, list)

        for note in data:
            self._assert_model_note(note)

        return data

    def create_model_notes(
        self,
        model_id: int,
        notes: t.Optional[t.List[Payload]] = None,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, t.List[Payload]]:
        if notes:
            notes = [
                {
                    **self.data_generator.generate_random_model_note(),
                    **note
                }
                for note in notes
            ]
        else:
            notes = [
                self.data_generator.generate_random_model_note(),
            ]

        response = self.api.create_model_notes(model_id=model_id, notes=notes, raise_on_status=False)
        response = t.cast(httpx.Response, response)
        expected_status = ExpectedHttpStatus.create(expected_status)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        notes = response.json()
        assert isinstance(notes, list)

        for note in notes:
            self._assert_model_note(note)

        model_notes = self.fetch_model_notes(model_id=model_id)
        model_notes = t.cast(t.List[Payload], model_notes)
        model_notes_ids = {it["id"] for it in model_notes}
        assert all(it["id"] in model_notes_ids for it in notes)
        return notes

    def delete_model_note(
        self,
        note_id: int,
        model_id: int,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Optional[httpx.Response]:
        response = self.api.delete_model_note(note_id=note_id, raise_on_status=False)
        response = t.cast(httpx.Response, response)
        expected_status = ExpectedHttpStatus.create(expected_status)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        notes = self.fetch_model_notes(model_id=model_id)
        notes = t.cast(t.List[Payload], notes)
        assert note_id not in [it["id"] for it in notes]

    def _assert_model_note(self, note):
        assert isinstance(note, dict)
        assert "id" in note
        assert "title" in note
        assert "text" in note
        assert "created_at" in note
        return note

    def create_check(
        self,
        model_id: int,
        check: t.Optional[Payload] = None,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        generated_payload = self.data_generator.generate_random_check()

        check = (
            {**generated_payload, **check}
            if check is not None
            else generated_payload
        )

        response = self.api.create_checks(model_id=model_id, checks=[check], raise_on_status=False)
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, list)
        assert isinstance(data[0], dict)
        assert "id" in data[0]

        checks = self.fetch_all_models_checks(model_id=model_id)
        checks = t.cast(t.List[Payload], checks)

        for it in checks:
            if it["id"] == data[0]["id"]:
                assert it["name"] == check["name"]
                assert it["config"] == check["config"]
                return it

        assert False, "Check instance was not created"

    def delete_model_checks(
        self,
        model_id: int,
        checks_names: t.List[str],
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Optional[httpx.Response]:
        expected_status = ExpectedHttpStatus.create(expected_status)

        response = t.cast(httpx.Response, self.api.delete_model_checks_by_name(
            model_id=model_id,
            check_names=checks_names,
            raise_on_status=False
        ))

        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        model_checks = self.fetch_all_models_checks(model_id=model_id)
        model_checks = t.cast(t.List[Payload], model_checks)

        for it in model_checks:
            assert it["name"] not in checks_names, f"Check {it['name']} was not deleted"

    def fetch_all_models_checks(
        self,
        model_id: int,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, t.List[Payload]]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.fetch_all_model_checks_by_id(model_id=model_id, raise_on_status=False)
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, list)

        for it in data:
            assert isinstance(it, dict)
            assert "id" in it
            assert "name" in it
            assert "config" in it

        return data

    def create_monitor(
        self,
        check_id: int,
        monitor: t.Optional[t.Dict[t.Any, t.Any]] = None,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        generated_payload = self.data_generator.generate_random_monitor()

        if monitor is None:
            monitor = generated_payload
        else:
            monitor = {**generated_payload, **monitor}

        response = self.api.create_monitor(check_id=check_id, monitor=monitor, raise_on_status=False)
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, dict)
        assert "id" in data
        return t.cast(Payload, self.fetch_monitor(data["id"]))

    # TODO: consider adding corresponding method to sdk API class
    def update_monitor(
        self,
        monitor_id: int,
        monitor: Payload,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[Payload, httpx.Response]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.put(f"monitors/{monitor_id}", json=monitor)
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        update_monitor = t.cast(Payload, self.fetch_monitor(monitor_id=monitor_id))

        for k in monitor.keys():
            assert monitor[k] == update_monitor[k]

        return update_monitor

    def delete_monitor(
        self,
        monitor_id: int,
        expected_status: ExpectedStatus = (200, 299)
    ):
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.delete(f"monitors/{monitor_id}")
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        self.fetch_monitor(monitor_id, expected_status=404)

    def fetch_monitor(
        self,
        monitor_id: int,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.fetch_monitor(monitor_id, raise_on_status=False)
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, dict)
        assert "id" in data and isinstance(data["id"], int)
        assert "name" in data and isinstance(data["name"], str)
        assert "check" in data and isinstance(data["check"], dict)
        assert "dashboard_id" in data
        assert "lookback" in data and isinstance(data["lookback"], int)
        assert "aggregation_window" in data and isinstance(data["aggregation_window"], int)
        assert "description" in data and isinstance(data["description"], str)
        assert "frequency" in data and isinstance(data["frequency"], str)
        assert "data_filters" in data
        return data

    def execute_monitor(
        self,
        monitor_id: int,
        options: Payload,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.post(f"monitors/{monitor_id}/run", json=options)
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, dict)
        # TODO:
        return data

    def create_alert_rule(
        self,
        monitor_id: int,
        alert_rule: t.Optional[t.Dict[t.Any, t.Any]] = None,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        generated_payload = self.data_generator.generate_random_alert_rule()

        alert_rule = (
            {**generated_payload, **alert_rule}
            if alert_rule is not None
            else generated_payload
        )

        response = self.api.create_alert_rule(monitor_id=monitor_id, alert_rule=alert_rule, raise_on_status=False)
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, dict)
        assert "id" in data

        return t.cast(Payload, self.fetch_alert_rule(alert_rule_id=data["id"]))

    def fetch_alert_rule(
        self,
        alert_rule_id: int,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.fetch_alert_rule(alert_rule_id, raise_on_status=False)
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        return self._assert_alert_rule(response.json())

    @classmethod
    def _assert_alert_rule(cls, data: Payload):
        assert isinstance(data, dict)
        assert "id" in data and isinstance(data["id"], int)
        assert "monitor_id" in data and isinstance(data["monitor_id"], int)
        assert "condition" in data and isinstance(data["condition"], dict)
        assert "alert_severity" in data and isinstance(data["alert_severity"], str)
        assert "is_active" in data and isinstance(data["is_active"], bool)
        return data

    # TODO: consider adding corresponding method to sdk API class
    def fetch_alert_rules(
        self,
        resolved: t.Optional[bool] = None,
        expected_status: ExpectedStatus = (200, 299)
) -> t.Union[httpx.Response, t.List[Payload]]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        params = {} if resolved is None else {"resolved": resolved}
        response = self.api.session.get("alert-rules", params=params)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, list)

        for it in data:
            self._assert_alert_rule(it)

        return data

    # TODO: consider adding corresponding method to sdk API class
    def fetch_alert_rules_count(
        self,
        model_id: t.Optional[int] = None,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        expected_status = ExpectedHttpStatus.create(expected_status)

        response = expected_status.assert_response_status(
            self.api.session.get(f"models/{model_id}/alert-rules/count")
            if model_id
            else self.api.session.get("alert-rules/count")
        )

        if expected_status.is_negative():
            return response

        severities = {it.value for it in AlertSeverity}
        data = response.json()
        assert isinstance(data, dict)
        assert all(k in severities for k in data.keys())
        assert all(isinstance(v, int) for v in data.values())
        return data

    # TODO: consider adding corresponding method to sdk API class
    def delete_alert_rule(
        self,
        alert_rule_id: int,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Optional[httpx.Response]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.delete(f"alert-rules/{alert_rule_id}")
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        self.fetch_alert_rule(alert_rule_id, expected_status=404)

    # TODO: consider adding corresponding method to sdk API class
    def update_alert_rule(
        self,
        alert_rule_id: int,
        alert_rule: t.Dict[t.Any, t.Any],
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.put(f"alert-rules/{alert_rule_id}", json=alert_rule)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        updated_alert_rule = self.fetch_alert_rule(alert_rule_id)
        updated_alert_rule = t.cast(Payload, updated_alert_rule)

        for k in alert_rule.keys():
            assert alert_rule[k] == updated_alert_rule[k]

        return updated_alert_rule

    # TODO: consider adding corresponding method to sdk API class
    def fetch_alerts(
        self,
        alert_rule_id: int,
        resolved: t.Optional[bool] = None,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, t.List[Payload]]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        params = {} if resolved is None else {"resolved": resolved}
        response = self.api.session.get(f"alert-rules/{alert_rule_id}/alerts", params=params)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, list)

        for it in data:
            self._assert_alert(it)

        return data

    def _assert_alert(self, data: Payload):
        assert isinstance(data, dict)
        assert "id" in data and isinstance(data["id"], int)
        assert "created_at" in data and isinstance(data["created_at"], str)
        assert "resolved" in data and isinstance(data["resolved"], bool)
        return data

    # TODO: consider adding corresponding method to sdk API class
    def resolve_alerts(
        self,
        alert_rule_id: int,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, t.List[Payload]]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.post(f"alert-rules/{alert_rule_id}/resolve-all")
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = self.fetch_alerts(alert_rule_id=alert_rule_id)
        data = t.cast(t.List[Payload], data)

        assert all(it["resolved"] is True for it in data)
        return data

    def reactivate_rule_alerts(
        self,
        alert_rule_id: int,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, t.List[Payload]]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.post(f"alert-rules/{alert_rule_id}/alerts/reactivate-resolved")
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = self.fetch_alerts(alert_rule_id=alert_rule_id)
        data = t.cast(t.List[Payload], data)
        assert all(it["resolved"] is False for it in data)
        return data

    # TODO: consider adding corresponding method to sdk API class
    def resolve_alert(
        self,
        alert_id: int,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[Payload, httpx.Response]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.post(f"alerts/{alert_id}/resolve")
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        alert = t.cast(Payload, self.fetch_alert(alert_id))
        assert alert["resolved"] is True
        return alert

    # TODO: consider adding corresponding method to sdk API class
    def reactivate_alert(
        self,
        alert_id: int,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[Payload, httpx.Response]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.post(f"alerts/{alert_id}/reactivate")
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        alert = t.cast(Payload, self.fetch_alert(alert_id))
        assert alert["resolved"] is False
        return alert

    # TODO: consider adding corresponding method to sdk API class
    def fetch_alert(
        self,
        alert_id: int,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.get(f"alerts/{alert_id}")
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        return self._assert_alert(response.json())

    # TODO: consider adding corresponding method to sdk API class
    def fetch_number_of_unresolved_alerts(
        self,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[Payload, httpx.Response]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.get("alerts/count_active")
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        severities = set(AlertSeverity)
        data = response.json()
        assert isinstance(data, dict)
        assert all(k in severities for k in data.keys())
        assert all(isinstance(v, int) for v in data.values())
        return data

    def create_model_version(
        self,
        model_id: int,
        model_version: t.Optional[Payload] = None,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[Payload, httpx.Response]:
        expected_status = ExpectedHttpStatus.create(expected_status)

        # TODO:
        # - generate features randomly
        # - generate a dataset to upload
        default_payload = {
            "name": self.data_generator.faker.name(),
            "features": {"a": "numeric", "b": "categorical"},
            "additional_data": {"c": "numeric"},
            "feature_importance": None,
            "classes": None
        }
        model_version = (
            {**default_payload, **model_version}
            if model_version is not None
            else default_payload
        )
        response = self.api.create_model_version(
            model_id=model_id,
            model_version=model_version,
            raise_on_status=False
        )
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, dict)
        assert "id" in data and isinstance(data["id"], int)

        return self.fetch_model_version(model_version_id=data["id"])

    def delete_model_version(
        self,
        model_version_id: int,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Optional[httpx.Response]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.delete_model_version_by_id(model_version_id, raise_on_status=False)
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        self.fetch_model_version(
            model_version_id=model_version_id,
            expected_status=404
        )

    def fetch_model_version(
        self,
        model_version_id: int,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.fetch_model_version_by_id(model_version_id=model_version_id, raise_on_status=False)
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, dict)
        assert "id" in data and isinstance(data["id"], int)
        assert "model_id" in data and isinstance(data["model_id"], int)
        assert "name" in data and isinstance(data["name"], str)
        assert "start_time" in data and isinstance(data["start_time"], str)
        assert "features_columns" in data and isinstance(data["features_columns"], dict)
        assert "additional_data_columns" in data and isinstance(data["additional_data_columns"], dict)
        assert "model_columns" in data and isinstance(data["model_columns"], dict)
        assert "meta_columns" in data and isinstance(data["meta_columns"], dict)
        assert "feature_importance" in data
        assert "statistics" in data
        assert "classes" in data
        assert "label_map" in data
        return data

    def fetch_model_version_schema(
        self,
        model_version_id: int,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.fetch_model_version_schema(model_version_id, raise_on_status=False)
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, dict)
        assert "monitor_schema" in data and isinstance(data["monitor_schema"], dict)
        assert "reference_schema" in data and isinstance(data["reference_schema"], dict)
        assert "features" in data
        assert "additional_data" in data
        assert "classes" in data
        assert "label_map" in data
        assert "feature_importance" in data
        return data

    def create_alert_webhook(
        self,
        payload: t.Optional[t.Dict[t.Any, t.Any]] = None,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        default_payload = self.data_generator.generate_random_standart_webhook()

        payload = (
            default_payload
            if not payload else
            {**default_payload, **payload}
        )

        response = self.api.session.post("alert-webhooks", json=payload)

        # webhook creation endpoint verifies whether provided http_url is 'alive'
        # or not, therefore, we need to give it a real URL, for that we use 'httpbin.org'
        # that sometimes might not respond in time, here we try to detect those
        # situations, and to skip the test if that happens
        if (
            response.status_code == 400
            and "Failed to connect to the given URL address" in response.text
            and "httpbin.org" in payload["http_url"]  # httpbin is a default http_url that is used
        ):
            import pytest  # pylint: disable=import-outside-toplevel
            pytest.skip(
                "default 'http_url' that is used to test webhook creation "
                "probably become unavailable or did not manage to respond "
                "in time, most commonly it is a temporary problem that does "
                "not have anything with tests or functionality correctness, "
                "therefore skipping this test"
            )

        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, dict)
        assert "id" in data
        return self.fetch_alert_webhook(data["id"])

    def delete_alert_webhook(
        self,
        webhook_id: int,
        expected_status: ExpectedStatus = (200, 299)
    ) -> httpx.Response:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.delete(f"alert-webhooks/{webhook_id}")
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        self.fetch_alert_webhook(webhook_id=webhook_id, expected_status=404)
        return response

    def fetch_alert_webhook(
        self,
        webhook_id: int,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.get(f"alert-webhooks/{webhook_id}")
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        return assert_alert_webhook(response.json())

    def fetch_all_alert_webhooks(
        self,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, t.List[Payload]]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.get("alert-webhooks")
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, list)

        for it in data:
            assert_alert_webhook(it)

        return data

    def upload_reference(
        self,
        model_version_id: int,
        data: t.List[Payload],
        expected_status: ExpectedStatus = (200, 299)
    ) -> httpx.Response:
        expected_status = ExpectedHttpStatus.create(expected_status)
        df = pd.DataFrame(data=data)

        response = t.cast(httpx.Response, self.api.upload_reference(
            model_version_id=model_version_id,
            reference=df.to_json(orient="split", index=False),
            raise_on_status=False
        ))

        expected_status.assert_response_status(response)
        return response

    def upload_samples(
        self,
        model_version_id: int,
        samples: t.List[Payload],
        expected_status: ExpectedStatus = (200, 299)
    ) -> httpx.Response:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = t.cast(httpx.Response, self.api.upload_samples(
            model_version_id=model_version_id,
            samples=samples,
            raise_on_status=False
        ))
        expected_status.assert_response_status(response)
        return response

    def upload_labels(
        self,
        model_id: int,
        data: t.List[Payload],
        expected_status: ExpectedStatus = (200, 299)
    ) -> httpx.Response:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = t.cast(httpx.Response, self.api.log_labels(
            model_id=model_id,
            data=data,
            raise_on_status=False
        ))
        expected_status.assert_response_status(response)
        return response


    # TODO: consider adding corresponding method to sdk API class
    def execute_check_for_window(
        self,
        check_id: int,
        options: Payload,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.post(f"checks/{check_id}/run/window", json=options)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, dict)
        return data

    # TODO: consider adding corresponding method to sdk API class
    def fetch_check_execution_info(
        self,
        check_id: int,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.get(f"checks/{check_id}/info")
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, dict)
        # TODO:
        return data

    # TODO: consider adding corresponding method to sdk API class
    def execute_check_for_range(
        self,
        check_id: int,
        options: Payload,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.post(f"checks/{check_id}/run/lookback", json=options)
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, dict)
        assert "output" in data and isinstance(data["output"], dict)

        for version, results in data["output"].items():
            assert isinstance(version, str)
            assert results is None or isinstance(results, list)
            if results is not None:
                for result in results:
                    if result is not None:
                        for k, v in result.items():
                            assert isinstance(k, str)
                            assert isinstance(v, float)

        return data

    # TODO: consider adding corresponding method to sdk API class
    def execute_check_for_reference(
        self,
        check_id: int,
        options: Payload,
        expected_status: ExpectedStatus = (200, 299)
    ):
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.post(f"checks/{check_id}/run/reference", json=options)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, dict)
        # TODO:
        return data

    # TODO: not sure whether it is a correct name
    # TODO: consider adding corresponding method to sdk API class
    def feature_drill_down(
        self,
        model_version_id: int,
        check_id: int,
        feature: str,
        options: Payload,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, t.List[Payload]]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.post(f"checks/{check_id}/group-by/{model_version_id}/{feature}", json=options)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, list)

        for it in data:
            assert isinstance(it, dict)
            for k in ("name", "filters", "count", "value"):
                assert k in it

        return data

    def check_display(
        self,
        model_version_id: int,
        check_id: int,
        options: Payload,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, t.List[Payload]]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.post(f"checks/{check_id}/display/{model_version_id}", json=options)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, list)

        for it in data:
            assert isinstance(it, dict)

        return data

    def fetch_dashboard(
        self,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.fetch_dashboard(raise_on_status=False)
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, dict)
        assert "id" in data
        assert "monitors" in data
        # TODO:
        return data

    # TODO: consider adding corresponding method to sdk API class
    def delete_dashboard(
        self,
        dashboard_id: int,
        expected_status: ExpectedStatus = (200, 299)
    ) -> httpx.Response:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.delete(f"dashboards/{dashboard_id}")
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)
        return response

    # TODO: consider adding corresponding method to sdk API class
    def update_dashboard(
        self,
        dashboard_id: int,
        dashboard: Payload,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.put(f"dashboards/{dashboard_id}", json=dashboard)
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        updated_dashboard = t.cast(Payload, self.fetch_dashboard())

        for k in dashboard.keys():
            assert dashboard[k] == updated_dashboard[k]

        return updated_dashboard

    # TODO: consider adding corresponding method to sdk API class
    def download_check_notebook(
        self,
        check_id: int,
        options: Payload,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, str]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.post(f"checks/{check_id}/get-notebook", json=options)
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.text
        assert len(data) != 0
        return data

    # TODO: consider adding corresponding method to sdk API class
    def download_monitor_notebook(
        self,
        monitor_id: int,
        options: Payload,
        expected_status: ExpectedStatus = (200, 299)
    ):
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.post(f"monitors/{monitor_id}/get-notebook", json=options)
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.text
        assert len(data) != 0
        return data

    def fetch_time_window_statistics(
        self,
        model_version_id: int,
        start_time: t.Optional[str] = None,
        end_time: t.Optional[str] = None,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        expected_status = ExpectedHttpStatus.create(expected_status)

        response = t.cast(httpx.Response, self.api.fetch_model_version_time_window_statistics(
            model_version_id=model_version_id,
            start_time=start_time,
            end_time=end_time,
            raise_on_status=False
        ))

        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, dict)
        # TODO:
        return data

    def fetch_n_of_samples(
        self,
        model_version_id: int,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, Payload]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.get_samples_count(model_version_id=model_version_id, raise_on_status=False)
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        data = response.json()
        assert isinstance(data, dict)
        assert "monitor_count" in data
        assert "reference_count" in data
        return data

    def execute_suite(
        self,
        model_version_id: int,
        options: Payload,
        expected_status: ExpectedStatus = (200, 299)
    ) -> t.Union[httpx.Response, str]:
        expected_status = ExpectedHttpStatus.create(expected_status)
        response = self.api.session.post(f"model-versions/{model_version_id}/suite-run", json=options)
        response = t.cast(httpx.Response, response)
        expected_status.assert_response_status(response)

        if expected_status.is_negative():
            return response

        content = response.text
        assert len(content) != 0
        # TODO: consider using BeautifulSoup to assert content
        return content


def random_string(n=5):
    return "".join(
        random.choice(string.ascii_lowercase)
        for it in range(n)
    )


def create_alert(alert_rule_id: int, async_session: AsyncSession, resolved: bool = True):
    dt = pdl.from_timestamp(1600000)

    alert = Alert(
        failed_values={"1": {"Accuracy": 0.3}},
        alert_rule_id=alert_rule_id,
        start_time=dt,
        end_time=dt,
        resolved=resolved
    )

    async_session.add(alert)
    return alert


def upload_classification_data(
    api: TestAPI,
    model_version_id: int,
    daterange: t.Optional[t.Sequence["PendulumDateTime"]] = None,
    id_prefix: str = "",
    is_labeled: bool = True,
    with_proba: bool = True,
    samples_per_date: int = 1,
    model_id: int = None,
):
    if daterange is None:
        curr_time = t.cast("PendulumDateTime", pdl.now("utc").set(minute=0, second=0, microsecond=0))
        day_before_curr_time = t.cast("PendulumDateTime", curr_time - pdl.duration(days=1))
        daterange = [day_before_curr_time.add(hours=hours) for hours in [1, 3, 4, 5, 7]]

    if is_labeled and model_id is None:
        raise ValueError("model_id must be provided if is_labeled is True")

    data = []
    labels = []

    for i, date in enumerate(daterange):
        for j in range(samples_per_date):
            time = date.isoformat()
            sample = {
                "_dc_sample_id": f"{id_prefix}{i}_{j}",
                "_dc_time": time,
                "_dc_prediction": "2" if i % 2 else "1",
                "a": 10 + i * j,
                "b": "ppppp",
            }
            if with_proba:
                sample["_dc_prediction_probabilities"] = [0.1, 0.3, 0.6] if i % 2 else [0.1, 0.6, 0.3]
            data.append(sample)
            if is_labeled:
                labels.append({"_dc_sample_id": sample["_dc_sample_id"], "_dc_label": "2" if i != 1 else "1"})

    response = api.upload_samples(model_version_id=model_version_id, samples=data)
    if labels:
        api.upload_labels(model_id=model_id, data=labels)
    return response, daterange[0], daterange[-1]

# def send_reference_request(client, model_version_id, dicts: list):
#     df = pd.DataFrame(data=dicts)
#     data = df.to_json(orient="table", index=False)
#     return client.post(
#         f"/api/v1/model-versions/{model_version_id}/reference",
#         files={"batch": ("data.json", data.encode())}
#     )


def assert_alert_webhook(data: Payload) -> Payload:
    assert isinstance(data, dict)
    assert "id" in data and isinstance(data["id"], int)
    assert "name" in data and isinstance(data["name"], str)
    assert "description" in data and isinstance(data["description"], str)
    assert "kind" in data and data["kind"] in {"STANDART", "PAGER_DUTY"}
    assert "http_url" in data and isinstance(data["http_url"], str)
    assert "http_method" in data and data["http_method"] in {"GET", "POST"}
    assert "notification_levels" in data and isinstance(data["notification_levels"], list)
    assert "additional_arguments" in data and isinstance(data["additional_arguments"], dict)
    return data
