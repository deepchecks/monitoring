import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

import logger from 'helpers/logger';

import { BillingPaymentDialogForm, BillingText } from '../Billing.styles';

import ActionDialog from 'components/base/Dialog/ActionDialog/ActionDialog';

import { constants } from '../billing.constants';

interface BillingPaymentDialogProps {
  openDialog: boolean;
  handleOpenDialog: () => void;
}

const { dialogButtonLabel, dialogSubHeader } = constants.billingPayment;

const BillingPaymentDialog = ({ openDialog, handleOpenDialog }: BillingPaymentDialogProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    if (!stripe || !elements) {
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: location.href
      }
    });

    if (error) {
      setErrorMessage(error.message as string);
      logger.error(error);
    }
  };

  return (
    <ActionDialog
      open={openDialog}
      closeDialog={handleOpenDialog}
      title={dialogSubHeader}
      submitButtonAction={handleSubmit}
      submitButtonLabel={dialogButtonLabel}
    >
      <BillingPaymentDialogForm>
        <PaymentElement />
        <BillingText color="red">{errorMessage}</BillingText>
      </BillingPaymentDialogForm>
    </ActionDialog>
  );
};

export default BillingPaymentDialog;
