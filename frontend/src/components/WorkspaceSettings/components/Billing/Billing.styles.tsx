import styled from 'styled-components';
import { Button } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import { theme } from 'components/lib/theme';

import { FlexColumnContainer, Row16Gap, RowAutoGap } from 'components/base/Container/Container.styles';

interface BillingUIProps {
  fontSize?: string;
  color?: string;
  weight?: string;
  margin?: string;
  border?: boolean;
  disabled?: boolean;
  bg?: string;
  align?: boolean;
  width?: string;
  padding?: string;
}

const BillingCardsContainer = styled(Row16Gap)`
  @media (max-width: 1700px) {
    flex-direction: column;
  }
`;

const BillingCardContainer = styled(FlexColumnContainer)<BillingUIProps>`
  border: ${`1px solid ${theme.palette.grey[200]}`};
  padding: 24px;
  border-radius: 14px;
  margin-top: 24px;
  background: white;
`;

const BillingText = styled.p<BillingUIProps>`
  color: ${p => p.color ?? `${theme.palette.common.black}`};
  font-size: ${p => p.fontSize ?? '1rem'};
  font-weight: ${p => p.weight ?? '400'};
  margin: ${p => p.margin ?? '0 auto 0 0'};
  text-align: ${p => p.align && 'center'};
  width: ${p => p.width ?? 'auto'};
  white-space: pre-line;
`;

const BillingCardButton = styled(Button)<BillingUIProps>`
  padding: 8px 24px;
  margin: ${p => p.margin ?? '0'};
  display: ${p => p.disabled && 'none'};
  border-radius: 8px;
`;

const BillingCardAmountContainer = styled.span`
  text-align: center;
  margin: 0 auto;
`;

const BillingSeparator = styled.span`
  height: 1px;
  margin: 16px 0;
  width: 100%;
  background: ${theme.palette.grey[200]};
`;

const FirstBillingPaymentForm = styled.form`
  width: 100%;
`;

const FirstBillingPaymentButton = styled(Button)`
  && {
    width: 100%;
    border-radius: 8px;
    margin: 48px 0;
  }
`;

const FirstBillingContainer = styled(FlexColumnContainer)`
  width: 100%;
  max-width: 800px;
  margin: auto;
  gap: 24px;
`;

const BillingTransactionContainer = styled(RowAutoGap)<BillingUIProps>`
  background: ${p => p.bg ?? `${theme.palette.common.white}`};
  border-radius: 14px;
  padding: 16px;
`;

const BillingMethodImg = styled.img`
  width: 50px;
  height: 50px;
`;

const BillingMethodBorderContainer = styled(RowAutoGap)`
  border: 1px solid ${theme.palette.grey[200]};
  border-radius: 14px;
  padding: 8px 14px;
  margin: 10px 0 0;
`;

const BillingTransactionDownloadIcon = styled(OpenInNewIcon)`
  && {
    cursor: pointer;
  }
`;

export {
  BillingText,
  FirstBillingPaymentForm,
  FirstBillingPaymentButton,
  FirstBillingContainer,
  BillingCardContainer,
  BillingCardButton,
  BillingSeparator,
  BillingTransactionContainer,
  BillingMethodImg,
  BillingMethodBorderContainer,
  BillingCardAmountContainer,
  BillingCardsContainer,
  BillingTransactionDownloadIcon
};
