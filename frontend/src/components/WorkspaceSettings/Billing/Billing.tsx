import React, { useEffect, useState } from 'react';

import { getSubscriptionsApiV1BillingSubscriptionGet } from 'api/generated';

import BillingPaidSkeleton from './BillingPaidView/BillingPaidSkeleton';
import BillingPaidView from './BillingPaidView/BillingPaidView';
import FirstBilling from './FirstBilling/FirstBilling';

import { Subscriptions } from './billing.types';

import { resError } from 'helpers/types/resError';

const Billing = () => {
  const [subscriptions, setSubscriptions] = useState<Subscriptions[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getSubscription = async () => {
    const response = (await getSubscriptionsApiV1BillingSubscriptionGet()) as Subscriptions[];

    if (response) {
      if ((response as unknown as resError).error_message) {
        setIsLoading(false);
      } else {
        response && setSubscriptions([...response]);
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    getSubscription();
  }, []);

  const isPaid = subscriptions.length > 0 && subscriptions[0]?.status === 'active';

  if (isLoading) {
    return <BillingPaidSkeleton />;
  }

  return isPaid ? <BillingPaidView subscriptions={subscriptions} /> : <FirstBilling />;
};

export default Billing;
