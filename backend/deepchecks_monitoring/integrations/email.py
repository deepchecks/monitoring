# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Represent the email integration."""
import logging
import pathlib
import typing as t
from email.message import EmailMessage as GenericEmailMsg
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from smtplib import SMTP

from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, EmailStr
from typing_extensions import Self

from deepchecks_monitoring.config import EmailSettings

# TODO: change this
TEMPLATES_DIR = pathlib.Path(__file__).absolute().parent.parent / "templates"
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

logger: logging.Logger = logging.getLogger(__name__)


class Recepient(BaseModel):
    """Represent an email recipient."""

    email: EmailStr
    name: t.Optional[str] = None

    def as_dict(self) -> t.Dict[str, str]:
        """Return the email as a dict."""
        r = f"{self.name} <{self.email}>" if self.name else self.email
        return {"raw_email": self.email, "recepient": r}


class EmailMessage:
    """Represent an email message.

    Parameters
    ----------
    subject: str
        The subject of the email.
    sender: str
        The email sender.
    recipients: t.Sequence
        The email recipients.
    """

    def __init__(
        self,
        subject: str,
        sender: str,
        recipients: t.Sequence[t.Union[str, Recepient]],
        template_name: str,
        *,
        reply_to: t.Optional[str] = None,
        campaign_key: t.Optional[str] = None,
        template_context: t.Optional[t.Dict[t.Any, t.Any]] = None,
        headers: t.Optional[t.Dict[t.Any, t.Any]] = None,
    ):
        template_context = template_context or {}

        if "utm_tags" not in template_context:
            template_context.update({
                "utm_tags":
                f"utm_source=deepchecks&utm_medium=email&utm_campaign={template_name}"
            })

        self.recipients: t.List[Recepient] = []

        for it in recipients:
            if isinstance(it, str):
                self.recipients.append(Recepient(email=t.cast(EmailStr, it)))
            elif isinstance(it, Recepient):
                self.recipients.append(it)
            else:
                raise ValueError(f"Unexpected recepient type {type(it)}")

        template = templates.get_template(f"email/{template_name}.html")

        self.sender = sender
        self.campaign_key = campaign_key
        self.subject = subject
        self.html_body = template.render(template_context)
        self.txt_body = ""
        self.headers = headers if headers else {}
        self.reply_to = reply_to

    def add_recipient(self: Self, email: str, name: t.Optional[str] = None) -> Self:
        """Add a recipient to the email."""
        if name is None:
            self.recipients.append(Recepient(email=t.cast(EmailStr, email)))
        else:
            self.recipients.append(Recepient(
                email=t.cast(EmailStr, email),
                name=name
            ))
        return self

    def as_generic_email_msgs(self) -> t.Sequence[GenericEmailMsg]:
        """Convert to a generic email message."""
        if not self.recipients:
            raise ValueError("No recipients provided, use 'EmailMessage.add_recipient()'")

        msgs = []

        for recipient in self.recipients:
            msg = MIMEMultipart("alternative")
            msg["From"] = f"Deepchecks App <{self.sender}>"
            msg["To"] = recipient.email
            msg["Subject"] = self.subject
            msg["Reply-To"] = self.reply_to if self.reply_to else ""
            msg.attach(MIMEText("PLAIN", "text"))  # TODO: Have a good plain message
            msg.attach(MIMEText(self.html_body, "html"))

            for h, val in self.headers.items():
                msg[h] = val

            msgs.append(msg)

        return msgs


class EmailSender:
    """Sends emails."""

    settings: EmailSettings

    def __init__(self, settings: EmailSettings):
        self.settings = settings

        if not self.is_email_available:
            logger.error("Email services are not available.")

    @property
    def is_email_available(self) -> bool:
        """Return whether email services are available on this instance (i.e. settings are in place)."""
        try:
            with SMTP(host=self.settings.email_smtp_host, port=self.settings.email_smtp_port) as smtp:
                smtp.starttls()
                smtp.login(
                    user=self.settings.email_smtp_username,
                    password=self.settings.email_smtp_password
                )
                smtp.noop()
                return True
        except Exception:  # pylint: disable=broad-except
            return False

    def send(self, subject, recipients, template_name, template_context):
        if not self.is_email_available:
            return

        message = EmailMessage(
            subject=subject,
            sender=self.settings.deepchecks_email,
            recipients=recipients,
            template_name=template_name,
            template_context=template_context
        )
        with SMTP(host=self.settings.email_smtp_host, port=self.settings.email_smtp_port) as smtp:
            smtp.starttls()
            smtp.login(
                user=self.settings.email_smtp_username,
                password=self.settings.email_smtp_password
            )
            for msg in message.as_generic_email_msgs():
                try:
                    smtp.send_message(msg=msg)
                except Exception as e:  # pylint: disable=broad-except
                    raise RuntimeError(f"Error sending message to recipient {msg['To']}") from e
