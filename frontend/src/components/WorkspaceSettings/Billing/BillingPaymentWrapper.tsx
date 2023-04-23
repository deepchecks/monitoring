import React, { ReactNode } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

interface Props {
  children: ReactNode | ReactNode[];
  clientSecret?: string;
}

const BillingPaymentWrapper = ({ children, clientSecret }: Props) => {
  const storageVars = localStorage.getItem('environment');
  const stripeApiKey = storageVars && JSON.parse(storageVars).stripeApiKey;

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
