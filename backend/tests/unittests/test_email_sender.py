import pytest

from deepchecks_monitoring.integrations.email import EmailMessage, EmailSender


@pytest.mark.asyncio
async def test_email_sender(smtp_server, settings):
    email_sender = EmailSender(settings)

    email_sender.send(EmailMessage(
        subject="Hello world",
        sender="foo@testing.com",
        recipients=["bar@testing.com"],
        template_name="new_alert"
    ))

    assert len(smtp_server.handler.mailbox) == 1

    email = smtp_server.handler.mailbox[0]
    assert email["From"] == "Deepchecks App <foo@testing.com>"
    assert email["To"] == "bar@testing.com"
    assert email["Subject"] == "Hello world"
