import React from 'react';
import dayjs from 'dayjs';

import { BillingText, BillingTransactionContainer, BillingTransactionDownloadIcon } from '../Billing.styles';

import { theme } from 'components/lib/theme';

interface BillingTransactionProps {
  id: string;
  plan?: string;
  models?: number;
  paid: boolean;
  amount: number;
  receipt_url: string;
  created: number;
  index: number;
}

const BillingTransaction = (props: BillingTransactionProps) => {
  const { created, plan, models, paid, receipt_url, index } = props;

  const bg = index % 2 !== 0 ? `${theme.palette.grey[100]}` : `${theme.palette.common.white}`;
  const activeColor = paid ? `${theme.palette.success.main}` : 'gray';
  const paidText = paid ? 'PAID' : 'INCOMPLETE';
  const modelsNumber = (models && models + 1) ?? 1;
  const planText = plan ?? 'No plan provided';

  return (
    <BillingTransactionContainer bg={bg}>
      <BillingText width="25%">{modelsNumber}</BillingText>
      <BillingText width="25%">{planText}</BillingText>
      <BillingText color={activeColor} weight={'600'} width="25%">
        {paidText}
      </BillingText>
      <BillingText width="25%">{dayjs(created * 1000).format('lll')}</BillingText>
      <a href={receipt_url} download={'Receipt.pdf'} target="_blank" rel="noreferrer">
        <BillingTransactionDownloadIcon color={'primary'} />
      </a>
    </BillingTransactionContainer>
  );
};

export default BillingTransaction;
