import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement, AddressElement } from '@stripe/react-stripe-js';

import logger from 'helpers/services/logger';

import { FirstBillingPaymentForm, BillingText, FirstBillingPaymentButton } from '../Billing.styles';

import { constants } from '../billing.constants';
import { Loader } from 'components/base/Loader/Loader';

const FirstBillingPayment = () => {
  const stripe = useStripe();
  const elements = useElements();

  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleClearErrMessage = () => setErrorMessage('');

  const handleSubmit = async () => {
    setIsLoading(true);
    setErrorMessage('');

    if (!stripe || !elements) {
      setIsLoading(false);

      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: location.href
      }
    });

    if (error) {
      setIsLoading(false);
      setErrorMessage(error.message as string);
      logger.error('Error on confirm stripe payment', error);
    }

    setIsLoading(false);
  };

  return (
    <FirstBillingPaymentForm>
      <AddressElement options={{ mode: 'billing' }} onChange={handleClearErrMessage} />
      <br />
      <PaymentElement onChange={handleClearErrMessage} options={{ layout: 'accordion' }} />
      <BillingText color="red">{errorMessage}</BillingText>
      <br />
      {isLoading ? (
        <Loader />
      ) : (
        <FirstBillingPaymentButton onClick={handleSubmit}>
          {constants.firstBilling.submitButtonLabel}
        </FirstBillingPaymentButton>
      )}
    </FirstBillingPaymentForm>
  );
};

export default FirstBillingPayment;
