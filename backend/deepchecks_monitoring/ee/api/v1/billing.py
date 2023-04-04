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
from datetime import datetime

import sqlalchemy as sa
import stripe
from fastapi import Depends, Request
from pydantic.main import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.dependencies import AsyncSessionDep, SettingsDep
from deepchecks_monitoring.exceptions import AccessForbidden, BadRequest
from deepchecks_monitoring.public_models import Billing, Organization, User
from deepchecks_monitoring.public_models.organization import OrgTier
from deepchecks_monitoring.utils import auth

from .routers import cloud_router as router


class BillingSchema(BaseModel):
    """Billing schema."""

    id: int
    subscription_id: t.Optional[str]
    bought_models: int
    last_update: t.Optional[datetime]
    started_at: datetime
    organization_id: int

    class Config:
        """Schema config."""

        orm_mode = True


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


class ProductResponseSchema(BaseModel):
    """Schema that represent a product from stripe."""

    id: str
    default_price: str
    unit_amount: int
    name: str
    description: t.Optional[str]


class SubscriptionSchema(BaseModel):
    """Schema for the subscription object."""

    models: int
    subscription_id: str
    status: str
    start_date: int
    current_period_end: int
    cancel_at_period_end: bool
    plan: str


class ChargeSchema(BaseModel):
    """Schema for the charge object."""

    id: str
    plan: t.Optional[str]
    models: t.Optional[int]
    paid: bool
    amount: int
    receipt_url: str
    created: int


def _get_subscription(stripe_customer_id: str, status: t.Optional[str]) -> t.List[SubscriptionSchema]:
    subscriptions = stripe.Subscription.list(customer=stripe_customer_id, status=status)["data"]
    product_dict = {product["id"]: product["name"] for product in stripe.Product.list()["data"]}
    subscriptions_schemas = []
    for subscription in subscriptions:
        subscription_schema = SubscriptionSchema(
            models=subscription["quantity"],
            subscription_id=subscription["id"],
            status=subscription["status"],
            start_date=subscription["start_date"],
            current_period_end=subscription["current_period_end"],
            cancel_at_period_end=subscription["cancel_at_period_end"],
            plan=product_dict[subscription["items"]["data"][0]["price"]["product"]]
        )
        subscriptions_schemas.append(subscription_schema)
    return subscriptions_schemas


@router.get("/billing/charges", tags=["billing"], response_model=t.List[ChargeSchema])
async def list_all_charges(
        user: User = Depends(auth.AdminUser())  # pylint: disable=unused-argument
):
    """Get the list of available products from stripe."""
    try:
        charges_list = stripe.Charge.list(customer=user.organization.stripe_customer_id)["data"]
        invoices_dict = {invoice["id"]: invoice for invoice in
                         stripe.Invoice.list(customer=user.organization.stripe_customer_id)["data"]}
        sub_dict = {sub.subscription_id: sub for sub in
                    _get_subscription(user.organization.stripe_customer_id, "all")}
        charges_schema = []
        for charge in charges_list:
            invoice = invoices_dict.get(charge["invoice"]) if charge.get("invoice") else None
            sub = sub_dict.get(invoice["subscription"]) if invoice is not None else None
            if sub:
                charge_schema = ChargeSchema(plan=sub.plan, models=sub.models, **charge)
            else:
                charge_schema = ChargeSchema(**charge)
            charges_schema.append(charge_schema)
        return charges_schema
    except stripe.error.StripeError as e:
        raise BadRequest(str(e)) from e


@router.get("/billing/available-products", tags=["billing"], response_model=t.List[ProductResponseSchema])
async def list_all_products(
        user: User = Depends(auth.AdminUser())  # pylint: disable=unused-argument
):
    """Get the list of available products from stripe."""
    try:
        product_list = stripe.Product.list()
        price_dict = {price["id"]: price["unit_amount"] for price in stripe.Price.list()["data"]}
        return [ProductResponseSchema(unit_amount=price_dict[x["default_price"]], **x) for x in product_list["data"]]
    except stripe.error.StripeError as e:
        raise BadRequest(str(e)) from e


@router.post("/billing/payment-method", tags=["billing"])
async def update_payment_method(body: PaymentMethodSchema, user: User = Depends(auth.AdminUser())):
    """Update the payment method on stripe."""
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
    except stripe.error.StripeError as e:
        raise BadRequest(str(e)) from e


@router.get("/billing/payment-method", tags=["billing"], response_model=t.List)
async def get_payment_method(user: User = Depends(auth.AdminUser())) -> t.List:
    """Return the payment method of the organization."""
    customer_id = user.organization.stripe_customer_id

    try:
        return stripe.Customer.list_payment_methods(
            customer_id,
            type="card"
        )["data"]
    except stripe.error.StripeError as e:
        raise AccessForbidden(str(e)) from e


@router.get("/billing/subscription", tags=["billing"], response_model=t.List)
async def get_subscriptions(user: User = Depends(auth.AdminUser())) -> t.List:
    """Return a list of subscription of the organization."""
    try:
        subscriptions = stripe.Subscription.list(customer=user.organization.stripe_customer_id,
                                                 expand=["data.latest_invoice.payment_intent"])
        return subscriptions["data"]
    except stripe.error.StripeError as e:
        raise AccessForbidden(str(e)) from e


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
    except stripe.error.StripeError as e:
        raise BadRequest(str(e)) from e


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
    except stripe.error.StripeError as e:
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
    except stripe.error.StripeError as e:
        return AccessForbidden(str(e))


@router.post("/billing/webhook", tags=["billing"])
async def stripe_webhook(request: Request,
                         settings=SettingsDep,
                         session: AsyncSession = AsyncSessionDep):
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
        except stripe.error.StripeError as e:
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

    if event_type in [
        "charge.succeeded",
        "customer.subscription.created",
        "customer.subscription.deleted",
        "customer.subscription.updated"
    ]:
        org: Organization = await session.scalar(sa.select(Organization)
                                                 .where(Organization.stripe_customer_id == data["object"]["customer"]))
        if org is not None:
            billing: Billing = await session.scalar(sa.select(Billing).where(Billing.organization_id == org.id))
            if billing is None:
                billing = Billing(organization_id=org.id)
                session.add(billing)
            subs = _get_subscription(org.stripe_customer_id, "active")
            if len(subs) > 0:
                billing.bought_models = subs[0].models
                billing.subscription_id = subs[0].subscription_id
                org.tier = OrgTier.BASIC
            else:
                billing.bought_models = 0
                billing.subscription_id = None
                org.tier = OrgTier.FREE
            await session.flush()

    return {"status": "success"}
