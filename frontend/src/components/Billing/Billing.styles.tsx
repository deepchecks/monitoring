import styled from 'styled-components';
import { Button } from '@mui/material';
import { colors } from 'theme/colors';

const BillingContainer = styled.div`
  width: 100%;
  max-width: 400px;
`;

const BillingSubHeader = styled.h2`
  margin: 0 0 16px;
`;

interface BillingTextProps {
  color?: string;
}

const BillingText = styled.p<BillingTextProps>`
  margin: 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: ${p => p.color && p.color};
`;

const BillingDetailsContainer = styled.div`
  gap: 16px;
  padding: 24px;
  background-color: ${colors.neutral.grey.light};
  border-radius: 14px;
  box-shadow: 0 3px 10px ${colors.neutral.grey[300]};
`;

const BillingDetailsLink = styled.a`
  text-decoration: none;
`;

const BillingPaymentButton = styled(Button)`
  border-radius: 8px;
  margin: 48px 0 24px;
`;

const BillingPaymentDialogForm = styled.form`
  width: 600px;
  padding: 8px;
  width: 100%;
`;

const BillingPaymentMethodContainer = styled.div`
  margin: 24px 0;
  padding: 24px;
  background-color: ${colors.neutral.grey.light};
  border-radius: 14px;
  box-shadow: 0 3px 10px ${colors.neutral.grey[300]};
`;

const BillingPaymentFlexContainer = styled.div`
  display: flex;
  flex-direction: row;
`;

interface BillingPaymentMethodButton {
  fontSize?: string;
  margin?: string;
}

const BillingPaymentMethodButton = styled.button<BillingPaymentMethodButton>`
  background: none;
  border: none;
  font-weight: 700;
  font-size: ${p => (p.fontSize ? p.fontSize : '16px')};
  cursor: pointer;
  color: ${colors.primary.violet[300]};
  margin: ${p => (p.margin ? p.margin : '0 0 0 auto')};
`;

export {
  BillingContainer,
  BillingPaymentDialogForm,
  BillingPaymentButton,
  BillingDetailsContainer,
  BillingPaymentMethodContainer,
  BillingPaymentMethodButton,
  BillingSubHeader,
  BillingDetailsLink,
  BillingText,
  BillingPaymentFlexContainer
};
