import React, { memo, useMemo } from 'react';

import { AlertSeverity } from 'api/generated';

import { alpha, Box, Typography, styled, Stack } from '@mui/material';

import { ReactComponent as CriticalSeverityIcon } from 'assets/icon/severity/critical.svg';
import { ReactComponent as HighSeverityIcon } from 'assets/icon/severity/high.svg';
import { ReactComponent as LowSeverityIcon } from 'assets/icon/severity/low.svg';
import { ReactComponent as MediumSeverityIcon } from 'assets/icon/severity/medium.svg';

enum SEVERITY {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

interface AlertBadgeProps {
  severity: AlertSeverity | undefined;
  color: string;
}

const AlertBadgeComponent = ({ severity = SEVERITY.HIGH, color }: AlertBadgeProps) => {
  const { Icon, title } = useMemo(() => {
    const { LOW, MEDIUM, HIGH, CRITICAL } = SEVERITY;

    const severityMap = {
      [LOW]: {
        Icon: LowSeverityIcon,
        title: 'Low'
      },
      [MEDIUM]: {
        Icon: MediumSeverityIcon,
        title: 'Medium'
      },
      [HIGH]: {
        Icon: HighSeverityIcon,
        title: 'High'
      },
      [CRITICAL]: {
        Icon: CriticalSeverityIcon,
        title: 'Critical'
      }
    };

    return severityMap[severity];
  }, [severity]);

  return (
    <StyledContainer color={color}>
      <Stack direction="row" spacing="5px">
        <StyledIconContainer color={color}>
          <Icon width={11.2} height={11.2} fill="white" />
        </StyledIconContainer>
        <StyledTypography color={color}>{title}</StyledTypography>
      </Stack>
    </StyledContainer>
  );
};

interface ColorOptions {
  color: string;
}

const StyledContainer = styled(Box, {
  shouldForwardProp: prop => prop !== 'color'
})<ColorOptions>(({ color }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '5px',
  height: '27px',
  marginRight: '10px',
  padding: '0px 0px 0px 4px',
  border: `1px solid ${alpha(color, 0.4)}`,
  borderRadius: '1000px'
}));

const StyledIconContainer = styled(Box, {
  shouldForwardProp: prop => prop !== 'color'
})<ColorOptions>(({ color }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: 19,
  height: 19,
  backgroundColor: color,
  borderRadius: '680px'
}));

const StyledTypography = styled(Typography, {
  shouldForwardProp: prop => prop !== 'color'
})<ColorOptions>(({ color }) => ({
  fontWeight: 600,
  fontSize: '12px',
  letterSpacing: '0.1px',
  color,
  paddingRight: '5.5px'
}));

export const AlertsBadge = memo(AlertBadgeComponent);
