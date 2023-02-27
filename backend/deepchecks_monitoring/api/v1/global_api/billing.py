# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module representing the endpoints for billing."""
import typing as t

import stripe
from fastapi import Depends, Request
from pydantic.main import BaseModel

from deepchecks_monitoring.dependencies import SettingsDep
from deepchecks_monitoring.exceptions import AccessForbidden, BadRequest
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.utils import auth

from .global_router import router


class CheckoutSchema(BaseModel):
    """Schema for the request of create subscription endpoint."""

    price_id: str
    quantity: int


class SubscriptionCreationResponse(BaseModel):
    """Schema for the response of create subscription endpoint."""

    client_secret: str
    subscription_id: str


class PaymentMethodSchema(BaseModel):
    """Schema for the payment method update endpoint."""

    payment_method_id: str


@router.post("/billing/payment-method", tags=["billing"])
async def update_payment_method(body: PaymentMethodSchema, user: User = Depends(auth.AdminUser())):
    """Update the payment method on stripe"""
    try:
        stripe.PaymentMethod.attach(
            body.payment_method_id,
            customer=user.organization.stripe_customer_id,
        )
        # Set the default payment method on the customer
        stripe.Customer.modify(
            user.organization.stripe_customer_id,
            invoice_settings={
                "default_payment_method": body.payment_method_id,
            },
        )

        return
    except Exception as e:  # pylint: disable=broad-except
        return BadRequest(str(e))


@router.get("/billing/payment-method", tags=["billing"])
async def get_payment_method(user: User = Depends(auth.AdminUser())) -> t.List:
    """Return the payment method of the organization."""
    customer_id = user.organization.stripe_customer_id

    try:
        return stripe.Customer.list_payment_methods(
            customer_id,
            type="card"
        )
    except Exception as e:  # pylint: disable=broad-except
        raise AccessForbidden from e


@router.post("/billing/subscription", tags=["billing"], response_model=SubscriptionCreationResponse)
async def create_subscription(
        body: CheckoutSchema,
        user: User = Depends(auth.AdminUser())
) -> SubscriptionCreationResponse:
    """Creates a checkout session with stripe"""
    try:
        # Create the subscription
        subscription = stripe.Subscription.create(
            customer=user.organization.stripe_customer_id,
            items=[
                {
                    "price": body.price_id,
                    "quantity": body.quantity
                }
            ],
            payment_behavior="default_incomplete",
            expand=["latest_invoice.payment_intent"],
        )

        return SubscriptionCreationResponse(
            client_secret=subscription.latest_invoice.payment_intent.client_secret,
            subscription_id=subscription.id
        )
    except Exception as e:  # pylint: disable=broad-except
        raise BadRequest from e


@router.get("/billing/subscription", tags=["billing"], response_model=t.List)
async def get_subscriptions(user: User = Depends(auth.AdminUser())) -> t.List:
    """Return a list of subscription of the organization."""
    try:
        subscriptions = stripe.Subscription.list(customer=user.organization.stripe_customer_id,
                                                 expand=["data.latest_invoice.payment_intent"])
        return subscriptions["data"]
    except Exception as e:  # pylint: disable=broad-except
        raise AccessForbidden from e


@router.delete("/billing/subscription/{subscription_id}", tags=["billing"])
def cancel_subscription(
        subscription_id: str,
        user: User = Depends(auth.AdminUser())  # pylint: disable=unused-argument
):
    """Cancel the subscription."""
    try:
        # Cancel the subscription by deleting it
        deleted_subscription = stripe.Subscription.delete(
            subscription_id)
        return deleted_subscription
    except Exception as e:  # pylint: disable=broad-except
        return AccessForbidden(str(e))


@router.put("/billing/subscription/{subscription_id}", tags=["billing"], response_model=SubscriptionCreationResponse)
def update_subscription(
        subscription_id: str,
        body: CheckoutSchema,
        user: User = Depends(auth.AdminUser()),  # pylint: disable=unused-argument
) -> SubscriptionCreationResponse:
    """Update the subscription for the organization."""
    try:
        subscription = stripe.Subscription.retrieve(subscription_id)

        updated_subscription = stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=False,
            items=[{
                "id": subscription["items"]["data"][0].id,
                "price": body.price_id,
                "quantity": body.quantity
            }],
            expand=["latest_invoice.payment_intent"]
        )
        return SubscriptionCreationResponse(
            client_secret=updated_subscription.latest_invoice.payment_intent.client_secret,
            subscription_id=updated_subscription.id
        )
    except Exception as e:  # pylint: disable=broad-except
        return AccessForbidden(str(e))


@router.post("/billing/webhook", tags=["billing"])
async def stripe_webhook(request: Request, settings=SettingsDep):
    """Webhook to catch stripe events."""
    # You can use webhooks to receive information about asynchronous payment events.
    # For more about our webhook events check out https://stripe.com/docs/webhooks.
    webhook_secret = settings.stripe_webhook_secret
    request_data = await request.json()

    if webhook_secret:
        # Retrieve the event by verifying the signature using the raw body and secret if webhook signing is configured.
        signature = request.headers.get("stripe-signature")
        try:
            event = stripe.Webhook.construct_event(
                payload=request_data, sig_header=signature, secret=webhook_secret)
            data = event["data"]
        except Exception as e:  # pylint: disable=broad-except
            return e
        # Get the type of webhook event sent - used to check the status of PaymentIntents.
        event_type = event["type"]
    else:
        data = request_data["data"]
        event_type = request_data["type"]

    print(data["object"])

    if event_type == "invoice.paid":
        # Used to provision services after the trial has ended.
        # The status of the invoice will show up as paid. Store the status in your
        # database to reference when a user accesses your service to avoid hitting rate
        # limits.
        print(data)

    if event_type == "invoice.payment_failed":
        # If the payment fails or the customer does not have a valid payment method,
        # an invoice.payment_failed event is sent, the subscription becomes past_due.
        # Use this webhook to notify your user that their payment has
        # failed and to retrieve new card details.
        print(data)

    if event_type == "invoice.finalized":
        # If you want to manually send out invoices to your customers
        # or store them locally to reference to avoid hitting Stripe rate limits.
        print(data)

    if event_type == "customer.subscription.deleted":
        # handle subscription canceled automatically based
        # upon your subscription settings. Or if the user cancels it.
        print(data)

    return {"status": "success"}
