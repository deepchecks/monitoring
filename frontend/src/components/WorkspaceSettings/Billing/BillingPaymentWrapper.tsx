import React, { ReactNode } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

interface Props {
  children: ReactNode | ReactNode[];
  clientSecret?: string;
  stripeApiKey?: any;
}

const BillingPaymentWrapper = ({ children, clientSecret, stripeApiKey }: Props) => {
  const stripePromise = stripeApiKey && loadStripe(`${stripeApiKey}`);

  if (!stripeApiKey) {
    <></>;
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret: clientSecret }}>
      {children}
    </Elements>
  );
};

export default BillingPaymentWrapper;
