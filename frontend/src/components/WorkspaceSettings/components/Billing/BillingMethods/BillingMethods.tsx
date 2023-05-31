import React, { useEffect, useState } from 'react';

import BillingPaymentWrapper from '../BillingPaymentWrapper';
import BillingMethodDialog from './BillingMethodDialog';

import creditCard from 'assets/icon/credit-card.svg';

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

import { getStorageItem, storageKeys } from 'helpers/utils/localStorage';
import { getPaymentMethodApiV1BillingPaymentMethodGet } from 'api/generated';
import { resError } from 'helpers/types/resError';

const BillingMethods = ({ clientSecret }: { clientSecret: string }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [last4, setLast4] = useState('');

  const { stripeApiKey } = getStorageItem(storageKeys.environment);

  const getPaymentMethods = async () => {
    const response = await getPaymentMethodApiV1BillingPaymentMethodGet();

    if (response) {
      if ((response as unknown as resError)?.error_message) {
        setLast4('');
      } else if ((response[0] as any)?.card?.last4) {
        setLast4(`${(response[0] as any)?.card?.last4}`);
      }
    }
  };

  useEffect(() => {
    getPaymentMethods();
  }, []);

  const handleOpenDialog = () => setIsDialogOpen(true);
  const handleCloseDialog = () => setIsDialogOpen(false);

  return (
    <BillingCardContainer>
      <Col8Gap>
        <StyledH3>{constants.paymentMethod.title}</StyledH3>
        <BillingText color="gray">{constants.paymentMethod.description}</BillingText>
        <BillingMethodBorderContainer>
          <Row16Gap>
            <BillingMethodImg src={creditCard} alt={constants.paymentMethod.imageAlt} />
            <BillingText color="gray" weight="600">
              {constants.paymentMethod.last4Text(last4)}
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
