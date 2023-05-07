import React, { FC, memo, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { AlertSeverity } from 'api/generated';

import { alpha, Box, Typography, useTheme, styled, Stack } from '@mui/material';

import { ReactComponent as CriticalSeverityIcon } from '../../assets/icon/severity/critical.svg';
import { ReactComponent as HighSeverityIcon } from '../../assets/icon/severity/high.svg';
import { ReactComponent as LowSeverityIcon } from '../../assets/icon/severity/low.svg';
import { ReactComponent as MediumSeverityIcon } from '../../assets/icon/severity/medium.svg';
import { setParams } from 'helpers/utils/getParams';

export enum SEVERITY {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

interface AlertCountComponentProps {
  severity: AlertSeverity;
  count: number;
  showText?: boolean;
}

const AlertCountComponent: FC<AlertCountComponentProps> = ({
  severity = SEVERITY.HIGH,
  count,
  showText = true
}: AlertCountComponentProps) => {
  const theme = useTheme();

  const navigate = useNavigate();
  const location = useLocation();

  const linkToAlerts = () => {
    navigate(
      { pathname: '/alerts', search: setParams('severity', severity, false) },
      { replace: location.pathname === '/alerts' }
    );
  };

  const { color, Icon } = useMemo(() => {
    const { LOW, MEDIUM, HIGH, CRITICAL } = SEVERITY;

    const severityMap = {
      [LOW]: {
        color: theme.palette.severity.low,
        Icon: LowSeverityIcon
      },
      [MEDIUM]: {
        color: theme.palette.severity.medium,
        Icon: MediumSeverityIcon
      },
      [HIGH]: {
        color: theme.palette.severity.high,
        Icon: HighSeverityIcon
      },
      [CRITICAL]: {
        color: theme.palette.severity.critical,
        Icon: CriticalSeverityIcon
      }
    };

    return severityMap[severity];
  }, [severity, theme.palette.severity]);

  return (
    <StyledContainer onClick={linkToAlerts}>
      <StyledIcon>
        <Icon fill={color} width={18} height={18} />
      </StyledIcon>
      <Stack direction="row">
        <StyledCount color={color}>{count}&nbsp;</StyledCount>
        {showText && <StyledSeverity color={color}>{severity}</StyledSeverity>}
      </Stack>
    </StyledContainer>
  );
};

const StyledContainer = styled(Stack)({
  flexDirection: 'row',
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
