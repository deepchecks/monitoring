import React from 'react';

import { BillingText, BillingTransactionContainer } from '../Billing.styles';

import { colors } from 'theme/colors';

interface BillingTransactionProps {
  date: string;
  amount: string;
  plan: string;
  models: number;
  status: string;
  index: number;
}

const BillingTransaction = (props: BillingTransactionProps) => {
  const { date, amount, plan, models, status, index } = props;

  const bg = index % 2 !== 0 ? `${colors.neutral.grey[100]}` : `${colors.neutral.white}`;

  return (
    <BillingTransactionContainer bg={bg}>
      <BillingText>{date}</BillingText>
      <BillingText>{amount}</BillingText>
      <BillingText>{plan}</BillingText>
      <BillingText>{models}</BillingText>
      <BillingText color={`${colors.semantic.green[100]}`} weight={'600'}>
        {status}
      </BillingText>
    </BillingTransactionContainer>
  );
};

export default BillingTransaction;
