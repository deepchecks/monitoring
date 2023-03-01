import random
import string
import typing as t
from unittest.mock import patch

import furl
import pytest
import randomname
from fastapi.testclient import TestClient

from deepchecks_monitoring.ee.integrations.slack import (AuthedUserSchema, SlackIncomingWebhookSchema,
                                                         SlackInstallationSchema, SlackInstallationUtils,
                                                         SlackTeamSchema)


@pytest.mark.asyncio
async def test_slack_authorization_redirect_without_access_token(unauthorized_client: TestClient):
    response = unauthorized_client.get("/api/v1/slack.authorize")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_slack_authorization_redirect(client: TestClient):
    settings = client.app.state.settings

    response = client.get(
        "/api/v1/slack.authorize",
        follow_redirects=False
    )

    assert response.status_code == 307
    assert isinstance(response.headers.get("location"), str)
    assert "slack-app-oauth-state" in response.cookies

    url = furl.furl(url=response.headers.get("location"))
    query = dict(url.query.asdict()["params"])

    assert "state" in query
    assert "client_id" in query and query["client_id"] == settings.slack_client_id
    assert "scope" in query and query["scope"] == settings.slack_scopes
    assert "redirect_uri" in query

    redirect_uri = furl.furl(url=query["redirect_uri"])
    assert str(redirect_uri.path) == "/api/v1/slack.install"
    assert str(redirect_uri.host) == "test.com"


@pytest.mark.asyncio
async def test_slack_installation(client: TestClient):
    settings = client.app.state.settings

    state = fetch_installation_state(client=client)
    mock_target = "deepchecks_monitoring.ee.api.v1.slack.SlackInstallationUtils"
    slack_utils = MockedSlackInstallationUtils(settings)
    slack_utils.mocked_installation = generate_slack_installation()

    with patch(mock_target) as m:
        m.return_value = slack_utils

        response = client.get(
            "/api/v1/slack.install",
            params={"code": 123, "state": state},
            headers={
                "Cookie": f"slack-app-oauth-state={state};"
            }
        )

        assert response.status_code == 201
        assert response.content == b"Slack app installed"


@pytest.mark.asyncio
async def test_slack_installation_update(client: TestClient):
    settings = client.app.state.settings

    state = fetch_installation_state(client=client)
    mock_target = "deepchecks_monitoring.ee.api.v1.slack.SlackInstallationUtils"
    slack_utils = MockedSlackInstallationUtils(settings)
    slack_utils.mocked_installation = generate_slack_installation()

    with patch(mock_target) as m:
        m.return_value = slack_utils

        response = client.get(
            "/api/v1/slack.install",
            params={"code": 123, "state": state},
            headers={
                "Cookie": f"slack-app-oauth-state={state};"
            }
        )

        assert response.status_code == 201, response.content
        assert response.content == b"Slack app installed"

    # generate new state
    new_state = fetch_installation_state(client=client)

    with patch(mock_target) as m:
        m.return_value = slack_utils

        response = client.get(
            "/api/v1/slack.install",
            params={"code": 2345, "state": new_state},
            headers={
                "Cookie": f"slack-app-oauth-state={new_state};"
            }
        )

        assert response.status_code == 201, response.content
        assert response.content == b"Slack app installed"


@pytest.mark.asyncio
async def test_slack_installation_with_missing_state_param(client: TestClient):

    response = client.get(
        "/api/v1/slack.install",
        params={"code": 123}
    )

    assert response.status_code == 401, response.content
    assert response.content == b"Missing installation state code"


class MockedSlackInstallationUtils(SlackInstallationUtils):
    """Mock slack installation for testing."""

    @property
    def mocked_installation(self) -> t.Optional[SlackInstallationSchema]:
        return getattr(self, "_mocked_installation", None)

    @mocked_installation.setter
    def mocked_installation(self, value: SlackInstallationSchema):
        return setattr(self, "_mocked_installation", value)

    def finish_installation(self, code: str) -> SlackInstallationSchema:
        if self.mocked_installation:
            return self.mocked_installation
        else:
            return super().finish_installation(code)


def random_string():
    return "".join(
        random.choice(string.ascii_letters)
        for it in range(5)
    )


def generate_slack_installation():
    return SlackInstallationSchema(
        ok=True,
        app_id=random_string(),
        scope="shat:write,incomming-webhook",
        token_type="bot",
        access_token=random_string(),
        bot_user_id=random_string(),
        authed_user=AuthedUserSchema(
            id=random_string(),
        ),
        team=SlackTeamSchema(id=random_string(), name=randomname.get_name()),
        incoming_webhook=SlackIncomingWebhookSchema(
            channel_id=random_string(),
            channel=randomname.get_name(),
            url="https://testing.com",
            configuration_url="https://testing.com"
        )
    )


def fetch_installation_state(client: TestClient) -> str:
    response = client.get(
        "/api/v1/slack.authorize",
        follow_redirects=False
    )

    assert response.status_code == 307
    assert "slack-app-oauth-state" in response.cookies

    return response.cookies["slack-app-oauth-state"]
