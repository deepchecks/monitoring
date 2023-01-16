import { AlertSeverity } from 'api/generated';
import { alpha, Box, ListItem, styled, Typography } from '@mui/material';

interface StyledContainerProps {
  active: boolean;
}

export const StyledContainer = styled(ListItem, { shouldForwardProp: prop => prop !== 'active' })<StyledContainerProps>(
  ({ active, theme }) => {
    const style = {
      ':last-of-type': {
        border: 'none'
      },
      borderBottom: `1px dotted ${theme.palette.text.disabled}`
    };
    return {
      padding: '16px 38px 16px 30px',
      '@media (max-width: 1536px)': {
        padding: '12px 25px 12px 16px'
      },
      cursor: 'pointer',
      position: 'relative',
      backgroundColor: active ? 'rgba(209, 216, 220, 0.5)' : theme.palette.common.white,
      ':hover': {
        backgroundColor: theme.palette.grey[100]
      },
      ...style
    };
  }
);

export const StyledModelInfo = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%'
});

export const StyledTypographyDate = styled(Typography)({
  marginTop: '4px'
});

export const StyledAlert = styled(Box)(({ theme }) => ({
  width: 50,
  height: 60,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: alpha(theme.palette.error.main, 0.1),
  borderRadius: '20px',
  cursor: 'pointer'
}));

interface StyledAlertBadgeProps {
  severity: AlertSeverity;
}

export const StyledAlertBadge = styled(Box, { shouldForwardProp: prop => prop !== 'severity' })<StyledAlertBadgeProps>(
  ({ severity, theme }) => ({
    padding: '0 10px',
    '@media (max-width: 1536px)': {
      padding: '0 5px',
      borderRadius: '15px'
    },
    height: 60,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(theme.palette.severity[severity], 0.1),
    borderRadius: '20px',
    color: theme.palette.severity[severity],

    ':hover': {
      backgroundColor: theme.palette.severity[severity],
      color: theme.palette.common.white
    }
  })
);

export const StyledActiveModelResetButton = styled(Box)({
  position: 'absolute',
  width: 22,
  height: 22,
  borderRadius: '50%',
  backgroundColor: 'white',
  top: '50%',
  right: '8px',
  '@media (max-width: 1536px)': {
    right: '1px',
    width: 18,
    height: 18
  },
  transform: 'translateY(-50%)',

  '::before, ::after': {
    content: "''",
    position: 'absolute',
    display: 'block',
    height: 10,
    width: 2,
    background: '#000',
    left: '50%',
    top: '50%'
  },

  ':before': {
    transform: 'translate(-50%, -50%) rotate(45deg)'
  },

  ':after': {
    transform: 'translate(-50%, -50%) rotate(-45deg)'
  }
});
