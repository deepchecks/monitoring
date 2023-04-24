import React, { useEffect, useState } from 'react';

import {
  createSubscriptionApiV1BillingSubscriptionPost,
  listAllProductsApiV1BillingAvailableProductsGet
} from 'api/generated';

import BillingPlanCard from '../BillingPlanCard/BillingPlanCard';
import BillingPaymentWrapper from '../BillingPaymentWrapper';
import FirstBillingPayment from './FirstBillingPayment';

import { BillingText, FirstBillingContainer } from '../Billing.styles';

import { constants } from '../billing.constants';

import { resError } from 'helpers/types/resError';

import { getStorageItem, storageKeys } from 'helpers/utils/localStorage';

interface ProductsResponseType {
  default_price: string;
  id: string;
  name: string;
}

const FirstBilling = () => {
  const [clientSecret, setClientSecret] = useState<string>();
  const [errorMassage, setErrorMassage] = useState('');
  const [product, setProduct] = useState({
    default_price: ''
  });

  const { stripeApiKey } = getStorageItem(storageKeys.environment);

  const getProductDetails = async () => {
    const res = (await listAllProductsApiV1BillingAvailableProductsGet()) as ProductsResponseType[];
    setProduct(res[0]);
  };

  const handleUpgradeClick = async (quantity: number) => {
    const payload = { price_id: product.default_price, quantity: quantity as number };
    const response = (await createSubscriptionApiV1BillingSubscriptionPost(payload)) as { client_secret: string };

    if (response) {
      if (response && (response as unknown as resError)?.error_message) {
        setErrorMassage(constants.firstBilling.errorMassageContent);
      } else {
        setClientSecret(response?.client_secret);

        if (!stripeApiKey || !clientSecret) {
          setErrorMassage(constants.firstBilling.errorMassageContent);
        }
      }
    }
  };

  useEffect(() => {
    getProductDetails();
  }, []);

  useEffect(() => {
    if (stripeApiKey && clientSecret) {
      setErrorMassage('');
    }
  }, [stripeApiKey, clientSecret]);

  return (
    <FirstBillingContainer>
      <BillingPlanCard handleUpgradeClick={handleUpgradeClick} productQuantity={1} />
      <BillingText color="red">{errorMassage}</BillingText>
      {clientSecret && stripeApiKey && (
        <BillingPaymentWrapper clientSecret={clientSecret} stripeApiKey={stripeApiKey}>
          <FirstBillingPayment />
        </BillingPaymentWrapper>
      )}
    </FirstBillingContainer>
  );
};

export default FirstBilling;
