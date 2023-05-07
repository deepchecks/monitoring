import React, { Dispatch, SetStateAction, useEffect, memo, useMemo } from 'react';

import { AlertSeverity } from 'api/generated';

import { useTheme } from '@mui/material';

import { StyledContainer, StyledIconBox, StyledTypography } from './AlertCount.style';

import { ReactComponent as LowSeverityIcon } from 'assets/icon/severity/low.svg';
import { ReactComponent as MediumSeverityIcon } from 'assets/icon/severity/medium.svg';
import { ReactComponent as HighSeverityIcon } from 'assets/icon/severity/high.svg';
import { ReactComponent as CriticalSeverityIcon } from 'assets/icon/severity/critical.svg';

interface AlertCountComponentProps {
  severity: AlertSeverity;
  setColor: Dispatch<SetStateAction<string>>;
}

const AlertCountComponent = ({ severity = AlertSeverity.high, setColor }: AlertCountComponentProps) => {
  const theme = useTheme();
  const { color, Icon } = useMemo(() => {
    const { low, medium, high, critical } = AlertSeverity;

    const severityMap = {
      [low]: {
        color: theme.palette.severity.low,
        Icon: LowSeverityIcon
      },
      [medium]: {
        color: theme.palette.severity.medium,
        Icon: MediumSeverityIcon
      },
      [high]: {
        color: theme.palette.severity.high,
        Icon: HighSeverityIcon
      },
      [critical]: {
        color: theme.palette.severity.critical,
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

  useEffect(() => {
    setColor && setColor(color);
  }, [color, setColor]);

  return (
    <StyledContainer color={color}>
      <StyledIconBox>
        <Icon fill="white" width={27} height={26} />
      </StyledIconBox>
      <StyledTypography>{severity}</StyledTypography>
    </StyledContainer>
  );
};

export const AlertCount = memo(AlertCountComponent);
