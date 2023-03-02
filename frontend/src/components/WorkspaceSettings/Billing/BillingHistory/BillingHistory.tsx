import React from 'react';

import BillingTransaction from './BillingTransaction';

import { StyledH3 } from 'components/base/Text/Header.styles';
import { BillingCardContainer, BillingSeparator, BillingText, BillingTransactionContainer } from '../Billing.styles';
import { Col16Gap } from 'components/base/Container/Container.styles';
import { constants } from '../billing.constants';

const BillingHistory = () => {
  const transactions = [
    // TODO - Take from server
    { date: 'date', amount: 'amount', plan: 'plan', models: 4, status: 'paid' },
    { date: 'date', amount: 'amount', plan: 'plan', models: 4, status: 'paid' },
    { date: 'date', amount: 'amount', plan: 'plan', models: 4, status: 'paid' },
    { date: 'date', amount: 'amount', plan: 'plan', models: 4, status: 'paid' },
    { date: 'date', amount: 'amount', plan: 'plan', models: 4, status: 'paid' }
  ];

  return (
    <BillingCardContainer border>
      <Col16Gap>
        <StyledH3>{constants.billingHistory.title}</StyledH3>
        <BillingText color="gray">{constants.billingHistory.description}</BillingText>
      </Col16Gap>
      <BillingSeparator />
      <BillingTransactionContainer bg="white">
        {Object.keys(transactions[0]).map((val, i) => (
          <BillingText key={i} color="gray" weight="800">
            {val.toUpperCase()}
          </BillingText>
        ))}
      </BillingTransactionContainer>
      {transactions.map((transaction, i) => (
        <BillingTransaction key={i} index={i} {...transaction} />
      ))}
    </BillingCardContainer>
  );
};

export default BillingHistory;
