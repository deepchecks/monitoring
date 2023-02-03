import React, { FC, memo, useContext, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { AlertSeverity } from 'api/generated';
import { GlobalStateContext } from 'context';

import { alpha, Box, Typography, useTheme, styled, Stack } from '@mui/material';

import { ReactComponent as CriticalSeverityIcon } from '../assets/icon/severity/critical.svg';
import { ReactComponent as HighSeverityIcon } from '../assets/icon/severity/high.svg';
import { ReactComponent as LowSeverityIcon } from '../assets/icon/severity/low.svg';
import { ReactComponent as MediumSeverityIcon } from '../assets/icon/severity/medium.svg';

export enum SEVERITY {
  LOW = 'low',
  MID = 'mid',
  HIGH = 'high',
  CRITICAL = 'critical'
}

interface AlertCountComponentProps {
  severity: AlertSeverity;
  count: number;
}

const AlertCountComponent: FC<AlertCountComponentProps> = ({
  severity = SEVERITY.HIGH,
  count
}: AlertCountComponentProps) => {
  const theme = useTheme();
  const { changeAlertFilters } = useContext(GlobalStateContext);

  const navigate = useNavigate();
  const location = useLocation();

  const linkToAlerts = () => {
    navigate({ pathname: '/alerts' }, { replace: location.pathname === '/alerts' });
    changeAlertFilters(prevAlertFilters => ({ ...prevAlertFilters, severity: [severity] }));
  };

  const { color, Icon } = useMemo(() => {
    const { LOW, MID, HIGH, CRITICAL } = SEVERITY;

    const severityMap = {
      [LOW]: {
        color: theme.palette.error.contrastText,
        Icon: LowSeverityIcon
      },
      [MID]: {
        color: theme.palette.error.light,
        Icon: MediumSeverityIcon
      },
      [HIGH]: {
        color: theme.palette.error.dark,
        Icon: HighSeverityIcon
      },
      [CRITICAL]: {
        color: theme.palette.error.main,
        Icon: CriticalSeverityIcon
      }
    };

    return severityMap[severity];
  }, [
    severity,
    theme.palette.error.contrastText,
    theme.palette.error.dark,
    theme.palette.error.light,
    theme.palette.error.main
  ]);

  return (
    <StyledContainer onClick={linkToAlerts}>
      <StyledIcon>
        <Icon fill={color} width={18} height={18} />
      </StyledIcon>
      <Stack direction="row">
        <StyledCount color={color}>{count}&nbsp;</StyledCount>
        <StyledSeverity color={color}>{severity}</StyledSeverity>
      </Stack>
    </StyledContainer>
  );
};

const StyledContainer = styled(Stack)({
  flexDirection: 'row',
  width: '78px',
  height: '20px',
  cursor: 'pointer',
  transition: 'opacity 0.3s ease',

  ':hover': {
    opacity: 0.5
  }
});

const StyledIcon = styled(Box)({
  marginRight: '9px'
});

const StyledTypography = styled(Typography)({
  fontWeight: 600,
  lineHeight: '20px'
});

const StyledCount = styled(StyledTypography)({
  fontSize: '16px'
});

interface ColorOptions {
  color: string;
}

const StyledSeverity = styled(StyledTypography, {
  shouldForwardProp: prop => prop !== 'color'
})<ColorOptions>(({ color }) => ({
  fontSize: '12px',
  color: alpha(color, 0.5)
}));

export const AlertCount = memo(AlertCountComponent);
