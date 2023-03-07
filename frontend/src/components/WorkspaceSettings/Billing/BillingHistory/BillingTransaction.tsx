import React from 'react';
import dayjs from 'dayjs';

import { BillingText, BillingTransactionContainer } from '../Billing.styles';

import { theme } from 'theme';

interface BillingTransactionProps {
  start_date: number;
  plan: string;
  models: number;
  status: string;
  index: number;
}

const BillingTransaction = (props: BillingTransactionProps) => {
  const { start_date, plan, models, status, index } = props;

  const bg = index % 2 !== 0 ? `${theme.palette.grey[100]}` : `${theme.palette.common.white}`;
  const activeColor = status === 'active' ? `${theme.palette.success.main}` : 'gray';

  return (
    <BillingTransactionContainer bg={bg}>
      <BillingText width="25%">{models}</BillingText>
      <BillingText width="25%">{plan}</BillingText>
      <BillingText color={activeColor} weight={'600'} width="25%">
        {status.toUpperCase()}
      </BillingText>
      <BillingText width="25%">{dayjs(start_date * 1000).format('lll')}</BillingText>
    </BillingTransactionContainer>
  );
};

export default BillingTransaction;
