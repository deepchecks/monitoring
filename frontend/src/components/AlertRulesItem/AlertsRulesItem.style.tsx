import { AlertSeverity } from 'api/generated';

import { alpha, Box, Divider, IconButton, styled, Typography } from '@mui/material';

export const StyledMainWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  borderRadius: '10px',
  boxShadow: '0px 4px 13px 2px rgba(0, 0, 0, 0.12)',
  height: 100,
  width: '100%',
  position: 'relative',
  ':hover': {
    backgroundColor: theme.palette.primary.light,
    cursor: 'pointer',
    outline: `6px solid ${theme.palette.primary.contrastText}`
  },
  '@media (max-width: 1536px)': {
    height: 70
  }
}));

type StyledCriticalityProps = {
  criticality?: AlertSeverity;
  resolved?: boolean;
};

const RESOLVED_ALERT_COLOR_OPACITY = 0.7;

export const StyledCriticality = styled(Box, {
  shouldForwardProp: prop => prop !== 'criticality'
})<StyledCriticalityProps>(({ criticality = 'low', resolved, theme }) => {
  const getColor = (filed: AlertSeverity): string => {
    if (filed === 'low') {
      return alpha(theme.palette.error.contrastText, resolved ? RESOLVED_ALERT_COLOR_OPACITY : 1);
    }

    if (filed === 'mid') {
      return alpha(theme.palette.error.light, resolved ? RESOLVED_ALERT_COLOR_OPACITY : 1);
    }

    if (filed === 'high') {
      return alpha(theme.palette.error.dark, resolved ? RESOLVED_ALERT_COLOR_OPACITY : 1);
    }

    if (filed === 'critical') {
      return alpha(theme.palette.error.main, resolved ? RESOLVED_ALERT_COLOR_OPACITY : 1);
    }

    return alpha(theme.palette.error.main, resolved ? RESOLVED_ALERT_COLOR_OPACITY : 1);
  };

  return {
    height: '100%',
    backgroundColor: getColor(criticality),
    borderLeft: `5px solid ${alpha(theme.palette.common.white, 0.4)}`,
    minWidth: 80,
    padding: '22px 11px 20px 11px',
    textAlign: 'center',
    borderRadius: '10px 0px 0px 10px',
    color: theme.palette.common.white,
    '@media (max-width: 1536px)': {
      minWidth: 65,
      padding: '10px 11px 10px 11px'
    }
  };
});

export const StyledDescription = styled(Box)({
  padding: '22px 20px 22px 30px',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  minWidth: 290,
  '@media (max-width: 1536px)': {
    padding: '10px 20px 10px 30px',
    minWidth: 221
  }
});

export const StyledMonitorName = styled(Typography)({
  width: '240px',
  '@media (max-width: 1536px)': {
    width: '171px'
  }
});

export const StyledDivider = styled(Divider)(({ theme }) => ({
  borderColor: theme.palette.grey[300],
  margin: '14px 0',
  borderStyle: 'dashed'
}));

export const StyledInfo = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '31px 16px',
  width: '100%',
  height: '100%',
  '@media (max-width: 1536px)': {
    padding: '16px 16px'
  }
});

export const StyledProperty = styled(Box)({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  width: '22.5%'
});

export const StyledTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  fontSize: 12,
  lineHeight: '140%',
  color: theme.palette.text.disabled,
  textTransform: 'uppercase'
}));

export const StyledBlur = styled(Box)({
  position: 'absolute',
  right: 0,
  top: 0,
  height: '100%',
  width: 262,
  background: 'linear-gradient(90deg, rgba(241, 233, 254, 0) -12.12%, #F1E9FE 28.76%)',
  borderRadius: '10px',
  padding: '21px 25px 21px 87px',
  display: 'flex',
  justifyContent: 'space-between',
  '@media (max-width: 1536px)': {
    padding: '5px 25px 5px 87px'
  }
});

export const StyledIconButton = styled(IconButton)({
  backgroundColor: 'transparent'
});

export const StyledCaption = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main,
  display: 'block'
}));
