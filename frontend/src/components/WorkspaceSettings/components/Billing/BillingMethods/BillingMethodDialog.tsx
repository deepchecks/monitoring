import React, { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { StripeCardElement } from '@stripe/stripe-js';

import { updatePaymentMethodApiV1BillingPaymentMethodPost } from 'api/generated';

import logger from 'helpers/services/logger';

import ActionDialog from 'components/base/Dialog/ActionDialog/ActionDialog';

import { BillingText } from '../Billing.styles';

interface BillingMethodDialogProps {
  isDialogOpen: boolean;
  handleCloseDialog: () => void;
}

const STYLE_OPTIONS = {
  style: {
    base: {
      fontSize: '18px'
    }
  }
};

const BillingMethodDialog = ({ isDialogOpen, handleCloseDialog }: BillingMethodDialogProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    setErrorMessage('');

    if (!stripe || !elements) {
      return;
    }

    const paymentMethod = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement) as StripeCardElement
    });

    if (paymentMethod.error) {
      setErrorMessage(paymentMethod.error.message as string);
      logger.error('Error on create stripe payment method', paymentMethod.error);
    } else {
      updatePaymentMethodApiV1BillingPaymentMethodPost({ payment_method_id: paymentMethod.paymentMethod.id });

      window.location.reload();
    }
  };

  return (
    <ActionDialog
      open={isDialogOpen}
      title="Add payment method:"
      submitButtonAction={handleSubmit}
      submitButtonLabel="Add payment method"
      closeDialog={handleCloseDialog}
    >
      <br />
      <CardElement options={STYLE_OPTIONS} />
      <br />
      <BillingText color="red" margin="8px auto 24px">
        {errorMessage}
      </BillingText>
    </ActionDialog>
  );
};

export default BillingMethodDialog;
