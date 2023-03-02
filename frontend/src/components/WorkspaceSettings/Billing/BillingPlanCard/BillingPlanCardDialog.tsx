import React from 'react';

import ActionDialog from 'components/base/Dialog/ActionDialog/ActionDialog';

import { updateSubscriptionApiV1BillingSubscriptionSubscriptionIdPut } from 'api/generated';

import { BillingText } from '../Billing.styles';

import { constants } from '../billing.constants';

interface BillingPlanCardDialogProps {
  isDialogOpen: boolean;
  handleCloseDialog: () => void;
  quantity: number;
  priceId: string;
  subscriptionId: string;
}

const BillingPlanCardDialog = (props: BillingPlanCardDialogProps) => {
  const { isDialogOpen, handleCloseDialog, quantity, priceId, subscriptionId } = props;

  const totalPriceText = constants.cardPlan.upgradeDialogText((quantity - 1) * 89, quantity);

  const handleSubmit = () => {
    updateSubscriptionApiV1BillingSubscriptionSubscriptionIdPut(subscriptionId, {
      price_id: priceId,
      quantity: quantity
    });

    window.location.reload();
  };

  return (
    <ActionDialog
      open={isDialogOpen}
      title="Upgrade Plan:"
      submitButtonAction={handleSubmit}
      submitButtonLabel="Upgrade"
      closeDialog={handleCloseDialog}
    >
      <BillingText weight="600" margin="44px 0">
        {totalPriceText}
      </BillingText>
    </ActionDialog>
  );
};

export default BillingPlanCardDialog;
