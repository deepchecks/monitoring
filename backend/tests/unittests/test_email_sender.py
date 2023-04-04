import pytest

from deepchecks_monitoring.integrations.email import EmailSender


@pytest.mark.asyncio
async def test_email_sender(smtp_server, settings):
    email_sender = EmailSender(settings)

    email_sender.send(
        subject="Hello world",
        template_name="alert",
        recipients=["bar@testing.com"],
        template_context={}
    )

    assert len(smtp_server.handler.mailbox) == 1

    email = smtp_server.handler.mailbox[0]
    assert email["From"] == "Deepchecks App <app@deepchecks.com>"
    assert email["To"] == "bar@testing.com"
    assert email["Subject"] == "Hello world"
