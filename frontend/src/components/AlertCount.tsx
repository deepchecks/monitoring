import { alpha, Box, Typography, useTheme } from '@mui/material';
import { AlertSeverity } from 'api/generated';
import { GlobalStateContext } from 'context';
import React, { FC, memo, useContext, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

export type AlertsCount = Record<SEVERITY, number>;

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
        onClick={linkToAlerts}
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
            fontSize: 12,
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
