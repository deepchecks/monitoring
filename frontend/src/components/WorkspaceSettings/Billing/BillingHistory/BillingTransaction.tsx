import React from 'react';
import dayjs from 'dayjs';

import { BillingText, BillingTransactionContainer } from '../Billing.styles';

import { colors } from 'theme/colors';

interface BillingTransactionProps {
  start_date: number;
  plan: string;
  models: number;
  status: string;
  index: number;
}

const BillingTransaction = (props: BillingTransactionProps) => {
  const { start_date, plan, models, status, index } = props;

  const bg = index % 2 !== 0 ? `${colors.neutral.grey[100]}` : `${colors.neutral.white}`;
  const activeColor = status === 'active' ? `${colors.semantic.green[100]}` : 'gray';

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
