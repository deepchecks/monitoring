import React, { FC, memo, useMemo } from 'react';
import { alpha, Box, Stack, Typography, useTheme } from '@mui/material';

import { ReactComponent as LowSeverityIcon } from '../../assets/icon/severity/low.svg';
import { ReactComponent as MediumSeverityIcon } from '../../assets/icon/severity/medium.svg';
import { ReactComponent as HighSeverityIcon } from '../../assets/icon/severity/high.svg';
import { ReactComponent as CriticalSeverityIcon } from '../../assets/icon/severity/critical.svg';

export enum SEVERITY {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export type Criticality = 'low' | 'mid' | 'high' | 'critical';

export type AlertsCount = Record<SEVERITY, number>;

interface AlertCountComponentProps {
  severity: SEVERITY;
}

const AlertCountComponent: FC<AlertCountComponentProps> = ({ severity = SEVERITY.HIGH }: AlertCountComponentProps) => {
  const theme = useTheme();
  const { color, Icon } = useMemo(() => {
    const { LOW, MEDIUM, HIGH, CRITICAL } = SEVERITY;

    const severityMap = {
      [LOW]: {
        color: theme.palette.error.contrastText,
        Icon: LowSeverityIcon
      },
      [MEDIUM]: {
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
    <Stack
      className="severity-wrapper"
      alignItems="center"
      sx={{
        textAlign: 'center',
        backgroundColor: color,
        borderRadius: '10px 0px 0px 0px'
      }}
    >
      <Box
        sx={{
          padding: '19.5px 18px 0',
          height: '45.5px'
        }}
      >
        <Icon width={27} height={26} />
      </Box>
      <Typography
        sx={{
          color: theme.palette.common.white,
          mt: '10px',

          fontSize: 10,
          lineHeight: '12px',
          letterSpacing: '0.4px'
        }}
      >
        {severity}
      </Typography>
    </Stack>
  );
};

export const AlertCount = memo(AlertCountComponent);
