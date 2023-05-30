import React, { useState } from 'react';

import ActionDialog from 'components/base/Dialog/ActionDialog/ActionDialog';

import { updateSubscriptionApiV1BillingSubscriptionSubscriptionIdPut } from 'api/generated';

import { BillingText } from '../Billing.styles';
import { FlexContainer } from 'components/base/Container/Container.styles';

import { Loader } from 'components/base/Loader/Loader';

import { constants } from '../billing.constants';

import { resError } from 'helpers/types/resError';

interface BillingPlanCardDialogProps {
  isDialogOpen: boolean;
  handleCloseDialog: () => void;
  quantity: number;
  priceId: string;
  subscriptionId: string;
  initialQuantity: number;
}

const BillingPlanCardDialog = (props: BillingPlanCardDialogProps) => {
  const { isDialogOpen, handleCloseDialog, quantity, priceId, subscriptionId, initialQuantity } = props;

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>();

  const priceGap = initialQuantity - quantity;
  const totalPriceText =
    priceGap > 0
      ? constants.cardPlan.decreaseDialogText(priceGap * 89, priceGap)
      : constants.cardPlan.upgradeDialogText(priceGap * 89, priceGap);

  const handleSubmit = async () => {
    setLoading(true);

    const response = await updateSubscriptionApiV1BillingSubscriptionSubscriptionIdPut(subscriptionId, {
      price_id: priceId,
      quantity: quantity
    });

    if (response) {
      if ((response as unknown as resError).error_message) {
        setErrorMsg(constants.firstBilling.errorMassageContent);
        setLoading(false);
      } else if (response.client_secret) {
        window.location.reload();
      }
    }
  };

  return (
    <ActionDialog
      open={isDialogOpen}
      title="Update Plan:"
      submitButtonAction={handleSubmit}
      submitButtonLabel="Update"
      closeDialog={handleCloseDialog}
    >
      {loading ? (
        <FlexContainer margin="64px 0">
          <Loader />
        </FlexContainer>
      ) : (
        <BillingText weight="600" margin="44px 24px 84px" style={{ textAlign: 'left' }} fontSize="18px">
          {totalPriceText}
        </BillingText>
      )}
      <BillingText color="red">{errorMsg}</BillingText>
    </ActionDialog>
  );
};

export default BillingPlanCardDialog;
