import React, { useEffect, useState } from 'react';

import BillingPaymentWrapper from '../BillingPaymentWrapper';
import BillingMethodDialog from './BillingMethodDialog';

import creditCard from '../../../../assets/icon/credit-card.svg';

import { Col8Gap, Row16Gap } from 'components/base/Container/Container.styles';
import { StyledH3 } from 'components/base/Text/Header.styles';
import {
  BillingCardContainer,
  BillingText,
  BillingCardButton,
  BillingMethodImg,
  BillingMethodBorderContainer
} from '../Billing.styles';

import { constants } from '../billing.constants';

import { getPaymentMethodApiV1BillingPaymentMethodGet } from 'api/generated';

const BillingMethods = ({ clientSecret }: { clientSecret: string }) => {
  const [paymentMethods, setPaymentMethods] = useState([{ card: { last4: Number(null) } }]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const storageVars = localStorage.getItem('environment');
  const parsedVars = storageVars && JSON.parse(storageVars);
  const stripeApiKey = parsedVars && parsedVars?.stripeApiKey;

  const cardLast4 = paymentMethods && paymentMethods[0] && paymentMethods[0].card.last4;

  const handleOpenDialog = () => setIsDialogOpen(true);
  const handleCloseDialog = () => setIsDialogOpen(false);

  const getPaymentMethods = async () => {
    const response = await getPaymentMethodApiV1BillingPaymentMethodGet();

    if (response && response[0]) {
      setPaymentMethods(response as any[]);
    }
  };

  useEffect(() => {
    getPaymentMethods();
  }, []);

  return (
    <BillingCardContainer border>
      <Col8Gap>
        <StyledH3>{constants.paymentMethod.title}</StyledH3>
        <BillingText color="gray">{constants.paymentMethod.description}</BillingText>
        <BillingMethodBorderContainer>
          <Row16Gap>
            <BillingMethodImg src={creditCard} alt={constants.paymentMethod.imageAlt} />
            <BillingText color="gray" weight="600">
              {constants.paymentMethod.last4Text(cardLast4)}
            </BillingText>
          </Row16Gap>
          <BillingCardButton onClick={handleOpenDialog}>{constants.paymentMethod.buttonLabel}</BillingCardButton>
        </BillingMethodBorderContainer>
      </Col8Gap>
      {clientSecret && stripeApiKey && (
        <BillingPaymentWrapper clientSecret={clientSecret} stripeApiKey={stripeApiKey}>
          <BillingMethodDialog handleCloseDialog={handleCloseDialog} isDialogOpen={isDialogOpen} />
        </BillingPaymentWrapper>
      )}
    </BillingCardContainer>
  );
};

export default BillingMethods;
