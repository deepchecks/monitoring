import React, { useEffect, useState } from 'react';

import {
  BillingPaymentMethodButton,
  BillingPaymentMethodContainer,
  BillingSubHeader,
  BillingText
} from '../Billing.styles';
import { FlexRowContainer } from 'components/base/Container/Container.styles';

import BillingPaymentDialog from './BillingPaymentDialog';

import { constants } from '../billing.constants';
import { getPaymentMethodApiV1BillingPaymentMethodGet } from 'api/generated';

const BillingPayment = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');

  const handleOpenDialog = () => {
    setOpenDialog(!openDialog);
  };

  const getPaymentMethod = async () => {
    const res = (await getPaymentMethodApiV1BillingPaymentMethodGet()) as any;
    const response = await res.data;
    setPaymentMethod(response[0].card.last4);
  };

  useEffect(() => {
    getPaymentMethod();
  }, []);

  return (
    <BillingPaymentMethodContainer>
      <BillingSubHeader>{constants.billingPayment.subHeader}</BillingSubHeader>
      <FlexRowContainer>
        <BillingText>{constants.billingPayment.paymentMethodText(paymentMethod)}</BillingText>
        <BillingPaymentMethodButton onClick={handleOpenDialog}>
          {constants.billingPayment.payButton}
        </BillingPaymentMethodButton>
      </FlexRowContainer>
      <BillingPaymentDialog openDialog={openDialog} handleOpenDialog={handleOpenDialog} />
    </BillingPaymentMethodContainer>
  );
};

export default BillingPayment;
