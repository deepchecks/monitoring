import React, { useState } from 'react';

import BillingHistory from '../BillingHistory/BillingHistory';
import BillingMethods from '../BillingMethods/BillingMethods';
import BillingPlanCard from '../BillingPlanCard/BillingPlanCard';
import BillingPlanCardDialog from '../BillingPlanCard/BillingPlanCardDialog';

import { BillingCardsContainer } from '../Billing.styles';
import { Col16Gap } from 'components/base/Container/Container.styles';

import { Subscriptions } from '../billing.types';

const BillingPaidView = ({ subscriptions }: { subscriptions: Subscriptions[] }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [productQuantity, setProductQuantity] = useState(Number(subscriptions[0].quantity));

  const subscriptionId = subscriptions[0].id;
  const priceId = subscriptions[0].items.data[0].price.id;
  const clientSecret = subscriptions[0].latest_invoice.payment_intent.client_secret;

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setProductQuantity(Number(subscriptions[0].quantity));
  };

  const handleUpgradeClick = (quantity: number) => {
    setProductQuantity(quantity);
    setIsDialogOpen(true);
  };

  return (
    <Col16Gap>
      <BillingCardsContainer>
        <BillingPlanCard handleUpgradeClick={handleUpgradeClick} productQuantity={productQuantity} />
        <BillingMethods clientSecret={clientSecret} />
      </BillingCardsContainer>
      <BillingHistory />
      <BillingPlanCardDialog
        isDialogOpen={isDialogOpen}
        handleCloseDialog={handleCloseDialog}
        subscriptionId={subscriptionId}
        quantity={productQuantity}
        priceId={priceId}
      />
    </Col16Gap>
  );
};

export default BillingPaidView;
