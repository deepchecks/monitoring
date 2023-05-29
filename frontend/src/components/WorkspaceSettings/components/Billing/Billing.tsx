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

  const subStatuses = subscriptions && subscriptions?.map((sub: Subscriptions) => sub?.status);
  const isPaid = subStatuses && subStatuses?.includes('active');

  const getSubscription = async () => {
    const response = (await getSubscriptionsApiV1BillingSubscriptionGet()) as Subscriptions[];

    if (response) {
      if (!Array.isArray(response) || (response as unknown as resError).error_message) {
        setIsLoading(false);
      } else {
        setSubscriptions([...response]);
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    getSubscription();
  }, []);

  if (isLoading) {
    return <BillingPaidSkeleton />;
  }

  return isPaid ? <BillingPaidView subscriptions={subscriptions} /> : <FirstBilling />;
};

export default Billing;
