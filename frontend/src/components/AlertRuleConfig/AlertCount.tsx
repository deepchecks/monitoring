import React, { Dispatch, SetStateAction, useEffect, memo, useMemo } from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';

import { ReactComponent as LowSeverityIcon } from '../../assets/icon/severity/low.svg';
import { ReactComponent as MediumSeverityIcon } from '../../assets/icon/severity/medium.svg';
import { ReactComponent as HighSeverityIcon } from '../../assets/icon/severity/high.svg';
import { ReactComponent as CriticalSeverityIcon } from '../../assets/icon/severity/critical.svg';
import { AlertSeverity } from 'api/generated';

interface AlertCountComponentProps {
  severity: AlertSeverity;
  setColor: Dispatch<SetStateAction<string>>;
}

const AlertCountComponent = ({ severity = AlertSeverity.high, setColor }: AlertCountComponentProps) => {
  const theme = useTheme();
  const { color, Icon } = useMemo(() => {
    const { low, mid, high, critical } = AlertSeverity;

    const severityMap = {
      [low]: {
        color: theme.palette.error.contrastText,
        Icon: LowSeverityIcon
      },
      [mid]: {
        color: theme.palette.error.light,
        Icon: MediumSeverityIcon
      },
      [high]: {
        color: theme.palette.error.dark,
        Icon: HighSeverityIcon
      },
      [critical]: {
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

  useEffect(() => {
    setColor && setColor(color);
  }, [color, setColor]);

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
