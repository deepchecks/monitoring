import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

import logger from 'helpers/services/logger';

import { FirstBillingPaymentForm, BillingText, FirstBillingPaymentButton } from '../Billing.styles';

import { constants } from '../billing.constants';

const FirstBillingPayment = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    setErrorMessage('');

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
    <FirstBillingPaymentForm>
      <PaymentElement />
      <BillingText color="red">{errorMessage}</BillingText>
      <FirstBillingPaymentButton onClick={handleSubmit}>
        {constants.firstBilling.submitButtonLabel}
      </FirstBillingPaymentButton>
    </FirstBillingPaymentForm>
  );
};

export default FirstBillingPayment;
