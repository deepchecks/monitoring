import React, { ReactNode } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

import useConfig from 'helpers/hooks/useConfig';

interface Props {
  children: ReactNode | ReactNode[];
  clientSecret?: string;
}

const BillingPaymentWrapper = ({ children, clientSecret }: Props) => {
  const envVariables = useConfig();
  const stripePromise = loadStripe(`${envVariables.stripeApiKey}`);

  return (
    <Elements stripe={stripePromise} options={{ clientSecret: clientSecret }}>
      {children}
    </Elements>
  );
};

export default BillingPaymentWrapper;
