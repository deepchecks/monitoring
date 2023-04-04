import React from 'react';

import { Col16Gap } from 'components/base/Container/Container.styles';
import { BillingCardsContainer } from '../Billing.styles';

import { RectSkeleton } from 'components/base/Skeleton/Skeleton';

const BillingPaidSkeleton = () => (
  <Col16Gap>
    <br />
    <BillingCardsContainer>
      <RectSkeleton width={'100%'} height={190} borderRadius={'14px'} />
      <RectSkeleton width={'100%'} height={190} borderRadius={'14px'} />
    </BillingCardsContainer>
    <RectSkeleton width={'100%'} height={'30vh'} borderRadius={'14px'} />
  </Col16Gap>
);

export default BillingPaidSkeleton;
