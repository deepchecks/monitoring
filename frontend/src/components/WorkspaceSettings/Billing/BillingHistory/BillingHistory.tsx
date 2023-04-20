import React, { useEffect, useState } from 'react';

import logger from 'helpers/services/logger';
import { ChargeSchema, listAllChargesApiV1BillingChargesGet } from 'api/generated';

import BillingTransaction from './BillingTransaction';
import { RectSkeleton } from 'components/base/Skeleton/Skeleton';

import { StyledH3 } from 'components/base/Text/Header.styles';
import { BillingCardContainer, BillingSeparator, BillingText, BillingTransactionContainer } from '../Billing.styles';
import { Col16Gap } from 'components/base/Container/Container.styles';

import { constants } from '../billing.constants';

const BillingHistory = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<ChargeSchema[]>([]);

  const tableHeaders = ['models', 'plan', 'status', 'created'];

  const getBillingHistory = async () => {
    try {
      const response = await listAllChargesApiV1BillingChargesGet();

      response && setTransactions([...response]);
      setLoading(false);
    } catch (err) {
      logger.error(err);
    }
  };

  useEffect(() => {
    getBillingHistory();
  }, []);

  if (loading) {
    return <RectSkeleton width={'100%'} height={'30vh'} borderRadius={'14px'} margin={'16px 0'} />;
  }

  return (
    <BillingCardContainer border>
      <Col16Gap>
        <StyledH3>{constants.billingHistory.title}</StyledH3>
        <BillingText color="gray">{constants.billingHistory.description}</BillingText>
      </Col16Gap>
      <BillingSeparator />
      <BillingTransactionContainer bg="none">
        {tableHeaders.map((val, i) => (
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
