import React, { ReactNode } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

interface Props {
  children: ReactNode | ReactNode[];
  stripeApiKey: string;
  clientSecret?: string;
}

const BillingPaymentWrapper = ({ children, clientSecret, stripeApiKey }: Props) => {
  const stripePromise = loadStripe(`${stripeApiKey}`);

  return (
    <Elements stripe={stripePromise} options={{ clientSecret: clientSecret }}>
      {children}
    </Elements>
  );
};

export default BillingPaymentWrapper;
