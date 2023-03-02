import React, { useEffect, useState } from 'react';

import {
  createSubscriptionApiV1BillingSubscriptionPost,
  listAllProductsApiV1BillingAvailableProductsGet
} from 'api/generated';

import logger from 'helpers/services/logger';

import BillingPlanCard from '../BillingPlanCard/BillingPlanCard';
import BillingPaymentWrapper from '../BillingPaymentWrapper';
import FirstBillingPayment from './FirstBillingPayment';

import { BillingText, FirstBillingContainer } from '../Billing.styles';

import { constants } from '../billing.constants';

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

  const getProductDetails = async () => {
    const res = (await listAllProductsApiV1BillingAvailableProductsGet()) as ProductsResponseType[];
    setProduct(res[0]);
  };

  const handleUpgradeClick = async (quantity: number) => {
    try {
      const payload = { price_id: product.default_price, quantity: quantity as number };
      const response = (await createSubscriptionApiV1BillingSubscriptionPost(payload)) as { client_secret: string };

      setClientSecret(response.client_secret);
    } catch (err) {
      logger.error(err);
      setErrorMassage(constants.firstBilling.errorMassageContent);
    }
  };

  useEffect(() => {
    getProductDetails();
  }, []);

  return (
    <FirstBillingContainer>
      <BillingPlanCard handleUpgradeClick={handleUpgradeClick} productQuantity={0} />
      <BillingText color="red">{errorMassage}</BillingText>
      {clientSecret && (
        <BillingPaymentWrapper clientSecret={clientSecret}>
          <FirstBillingPayment />
        </BillingPaymentWrapper>
      )}
    </FirstBillingContainer>
  );
};

export default FirstBilling;
