import React, { ReactNode } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

interface Props {
  children: ReactNode | ReactNode[];
  clientSecret?: string;
}

const stripePromise = loadStripe(`${process.env.REACT_APP_STRIPE_KEY}`);

const BillingPaymentWrapper = ({ children, clientSecret }: Props) => (
  <Elements stripe={stripePromise} options={{ clientSecret: clientSecret }}>
    {children}
  </Elements>
);

export default BillingPaymentWrapper;
