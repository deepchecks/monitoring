import { AlertSeverity } from 'api/generated';
import { alpha, Box, ListItemButton, styled, Typography, Stack } from '@mui/material';

import { theme } from 'components/lib/theme';

interface StyledContainerProps {
  active: boolean;
}

export const StyledContainer = styled(ListItemButton, {
  shouldForwardProp: prop => prop !== 'active'
})<StyledContainerProps>(({ active, theme }) => ({
  padding: '24px',
  '@media (max-width: 1536px)': {
    padding: '16px'
  },
  cursor: 'pointer',
  position: 'relative',
  backgroundColor: active ? theme.palette.grey[200] : 'transparent',
  borderRadius: '16px',
  transition: 'background-color 0.3s ease',
  borderBottom: `1px solid ${theme.palette.grey.light}`,
  ':last-of-type': {
    border: 'none'
  }
}));

export const StyledModelInfo = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%'
});

export const StyledModelName = styled(Typography)({
  fontWeight: 600,
  fontSize: 16,
  lineHeight: '19px',
  marginBottom: '4px'
});

export const StyledDateContainer = styled(Stack)({
  flexDirection: 'row',
  marginTop: '4px'
});

const StyledDate = styled(Typography)({
  fontSize: 14,
  lineHeight: '17px',
  color: theme.palette.text.disabled
});

export const StyledDateTitle = styled(StyledDate)({
  fontWeight: 400
});

export const StyledDateValue = styled(StyledDate)({
  fontWeight: 600
});

interface StyledAlertBadgeProps {
  severity?: AlertSeverity;
  alertsCount?: number;
  disableHover?: boolean;
}

export const StyledAlertBadge = styled(Box, {
  shouldForwardProp: prop => prop !== 'severity' && prop !== 'alertsCount' && prop !== 'disableHover'
})<StyledAlertBadgeProps>(({ severity, alertsCount, disableHover, theme }) => {
  const severityColor = theme.palette.severity[alertsCount === 0 || severity == null ? 'low' : severity];

  return {
    padding: '0 10px',
    '@media (max-width: 1536px)': {
      padding: '0 5px'
    },

    height: 40,
    width: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(severityColor, 0.1),
    border: `1px solid ${alpha(severityColor, 0.2)}`,
    borderRadius: '16px',
    color: severityColor,
    transition: 'all 0.3s ease',

    ':hover': {
      backgroundColor: disableHover ? 'none' : severityColor,
      color: theme.palette.common.white
    }
  };
});

export const StyledAlertsCount = styled(Typography)({
  fontWeight: 600,
  fontSize: '16px',
  lineHeight: '19px'
});
