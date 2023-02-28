import React, { ChangeEvent } from 'react';
import { Input } from '@mui/material';

import { BillingDetailsContainer, BillingDetailsLink, BillingSubHeader, BillingText } from '../Billing.styles';

import { constants } from '../billing.constants';

interface BillingDetailsProps {
  setProductQuantity: (quantity: number) => void;
  modelPrice: number;
  totalPrice: number;
}

const { modelPriceText, totalPriceText, pricingLinkHref, pricingLinkLabel, inputPlaceholder, subHeader } =
  constants.billingDetails;

const BillingDetails = ({ setProductQuantity, modelPrice, totalPrice }: BillingDetailsProps) => {
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);

    setProductQuantity(value);
  };

  return (
    <BillingDetailsContainer>
      <BillingSubHeader>{subHeader}</BillingSubHeader>
      <Input onChange={handleInputChange} placeholder={inputPlaceholder} type="number" />
      <BillingText>{modelPriceText(modelPrice)}</BillingText>
      <BillingText>{totalPriceText(totalPrice)} </BillingText>
      <BillingDetailsLink href={pricingLinkHref}>{pricingLinkLabel}</BillingDetailsLink>
    </BillingDetailsContainer>
  );
};

export default BillingDetails;
