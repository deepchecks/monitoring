import React, { useEffect, useState } from 'react';

import logger from 'helpers/services/logger';

import BillingTransaction from './BillingTransaction';

import { StyledH3 } from 'components/base/Text/Header.styles';
import { BillingCardContainer, BillingSeparator, BillingText, BillingTransactionContainer } from '../Billing.styles';
import { Col16Gap } from 'components/base/Container/Container.styles';
import { constants } from '../billing.constants';
import { customInstance } from 'helpers/services/customAxios';

const BillingHistory = () => {
  const [transactions, setTransactions] = useState([{ plan: '', models: 1, status: '', start_date: 4, end_date: 1 }]);

  const tableHeaders = ['models', 'plan', 'status', 'start_date'];

  useEffect(() => {
    const getBillingHistory = async () => {
      try {
        const response = (await customInstance({
          method: 'GET',
          url: 'api/v1/billing/subscriptions-history'
        })) as any;

        setTransactions(response);
      } catch (err) {
        logger.error(err);
      }
    };

    getBillingHistory();
  }, []);

  return (
    <BillingCardContainer border>
      <Col16Gap>
        <StyledH3>{constants.billingHistory.title}</StyledH3>
        <BillingText color="gray">{constants.billingHistory.description}</BillingText>
      </Col16Gap>
      <BillingSeparator />
      <BillingTransactionContainer bg="white">
        {tableHeaders.map((val, i) => (
          <BillingText key={i} color="gray" weight="800" width="20%">
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
