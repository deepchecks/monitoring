import React, { useEffect, useState } from 'react';

import {
  createSubscriptionApiV1BillingSubscriptionPost,
  listAllProductsApiV1BillingAvailableProductsGet
} from 'api/generated';

import BillingDetails from './BillingDetails/BillingDetails';
import PaymentWrapper from './BillingPayment/PaymentWrapper';
import BillingPayment from './BillingPayment/BillingPayment';

import { BillingContainer, BillingPaymentButton, BillingText } from './Billing.styles';

import { constants } from './billing.constants';

const Billing = () => {
  const [productQuantity, setProductQuantity] = useState<number>();
  const [clientSecret, setClientSecret] = useState<string>();
  const [product, setProduct] = useState({
    default_price: ''
  });

  const modelPrice = 89; // Todo - change this to be taken from server
  const totalPrice = productQuantity ? modelPrice * productQuantity : 0;

  const getProductDetails = async () => {
    const res = (await listAllProductsApiV1BillingAvailableProductsGet()) as any;
    setProduct(res[0]);
  };

  const handleSaveClick = async () => {
    if (productQuantity) {
      const payload = { price_id: product.default_price, quantity: productQuantity };
      const response = (await createSubscriptionApiV1BillingSubscriptionPost(payload)) as any;

      setClientSecret(response.client_secret);
    }
  };

  useEffect(() => {
    getProductDetails();
  }, []);

  return (
    <BillingContainer>
      <h1>{constants.billingHeader}</h1>
      <BillingDetails setProductQuantity={setProductQuantity} modelPrice={modelPrice} totalPrice={totalPrice} />
      {productQuantity ? (
        <BillingPaymentButton onClick={handleSaveClick}>{constants.billingSaveButton}</BillingPaymentButton>
      ) : (
        <BillingText color="green">{constants.billingPaidText}</BillingText>
      )}
      {clientSecret && (
        <PaymentWrapper clientSecret={clientSecret}>
          <BillingPayment />
        </PaymentWrapper>
      )}
    </BillingContainer>
  );
};

export default Billing;
