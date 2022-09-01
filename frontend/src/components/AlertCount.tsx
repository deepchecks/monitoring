import React, { FC, memo, useMemo } from 'react';
import { alpha, Box, Typography, useTheme } from '@mui/material';

import { ReactComponent as LowSeverityIcon } from '../assets/icon/severity/low.svg';
import { ReactComponent as MediumSeverityIcon } from '../assets/icon/severity/medium.svg';
import { ReactComponent as HighSeverityIcon } from '../assets/icon/severity/high.svg';
import { ReactComponent as CriticalSeverityIcon } from '../assets/icon/severity/critical.svg';

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
  count: number;
}

const AlertCountComponent: FC<AlertCountComponentProps> = ({
  severity = SEVERITY.HIGH,
  count
}: AlertCountComponentProps) => {
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
    <Box
      className="severity-wrapper"
      sx={{
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center',
        cursor: 'pointer',
        padding: '6px 17px 6px 7px',
        borderRadius: '1000px',
        border: `1px solid ${alpha(color, 0.4)}`
      }}
    >
      <Box
        className="severity-svg-wrapper"
        sx={{
          height: 38,
          width: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          backgroundColor: color
        }}
      >
        <Icon width={18} height={16} />
      </Box>
      <Box
        className="severity-value-wrapper"
        sx={{
          marginLeft: '9px',
          color
        }}
      >
        <Typography variant="h5">{count}</Typography>
        <Typography
          sx={{
            fontSize: 10,
            lineHeight: '12px',
            letterSpacing: '0.4px'
          }}
        >
          {severity}
        </Typography>
      </Box>
    </Box>
  );
};

export const AlertCount = memo(AlertCountComponent);
