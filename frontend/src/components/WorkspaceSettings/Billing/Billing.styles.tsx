import styled from 'styled-components';
import { Button } from '@mui/material';

import { colors } from 'theme/colors';

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
}

const BillingCardsContainer = styled(Row16Gap)`
  @media (max-width: 1700px) {
    flex-direction: column;
  }
`;

const BillingCardContainer = styled(FlexColumnContainer)<BillingUIProps>`
  border: ${p => p.border && `1px solid ${colors.neutral.grey[200]}`};
  padding: 24px;
  border-radius: 14px;
  margin-top: 24px;
`;

const BillingText = styled.p<BillingUIProps>`
  color: ${p => p.color ?? `${colors.neutral.black}`};
  font-size: ${p => p.fontSize ?? '1rem'};
  font-weight: ${p => p.weight ?? '400'};
  margin: ${p => p.margin ?? '0 auto 0 0'};
  text-align ${p => p.align && 'center'}
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
  background: ${colors.neutral.grey[200]};
`;

const FirstBillingPaymentForm = styled.form`
  width: 100%;
`;

const FirstBillingPaymentButton = styled(Button)`
  width: 100%;
  border-radius: 8px;
  margin: 48px 0;
`;

const FirstBillingContainer = styled(FlexColumnContainer)`
  width: 100%;
  max-width: 800px;
  margin: auto;
  gap: 24px;
`;

const BillingPlanCardQuantityButton = styled.button<BillingUIProps>`
  background: ${colors.neutral.white};
  color: ${p => (p.disabled ? `${colors.neutral.grey[200]}` : `${colors.primary.violet[400]}`)};
  border: 2px solid ${p => (p.disabled ? `${colors.neutral.grey[200]}` : `${colors.primary.violet[400]}`)};
  cursor: ${p => !p.disabled && 'pointer'};
  font-size: 20px;
  font-weight: 800;
  border-radius: 50%;
  height: 28px;
  width: 28px;
  margin: 0 0 0 auto;
`;

const BillingTransactionContainer = styled(RowAutoGap)<BillingUIProps>`
  background: ${p => p.bg ?? `${colors.neutral.white}`};
  border-radius: 14px;
  padding: 16px;
`;

const BillingMethodImg = styled.img`
  width: 50px;
  height: 50px;
`;

const BillingMethodBorderContainer = styled(RowAutoGap)`
  border: 1px solid ${colors.neutral.grey[200]};
  border-radius: 14px;
  padding: 8px 14px;
  margin: 10px 0 0;
`;

export {
  BillingText,
  FirstBillingPaymentForm,
  FirstBillingPaymentButton,
  FirstBillingContainer,
  BillingPlanCardQuantityButton,
  BillingCardContainer,
  BillingCardButton,
  BillingSeparator,
  BillingTransactionContainer,
  BillingMethodImg,
  BillingMethodBorderContainer,
  BillingCardAmountContainer,
  BillingCardsContainer
};
