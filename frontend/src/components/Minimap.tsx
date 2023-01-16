import React, { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-dayjs-3';
import mixpanel from 'mixpanel-browser';

import { AlertSchema, AlertSeverity } from 'api/generated';

import { drawAlertsOnMinimap } from 'helpers/diagramLine';
import { GraphData } from 'helpers/types';

import { alpha, Box, Button, Stack, styled, useTheme } from '@mui/material';

import { FastForward, Rewind } from 'assets/icon/icon';

Chart.register(...registerables, zoomPlugin);

interface MinimapProps {
  alerts: AlertSchema[];
  alertIndex: number;
  alertSeverity: AlertSeverity;
  changeAlertIndex: Dispatch<SetStateAction<number>>;
  data: ChartData<'line', GraphData>;
  options: ChartOptions<'line'>;
}

const StyledArrow = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  background: theme.palette.grey[50],
  height: '100%',
  padding: '0 5px',
  borderRadius: '5px'
}));

const StyledButton = styled(Button)({
  minWidth: 35,
  width: 35,
  padding: 0
});

const StyledBoxLine = styled(Box)({
  position: 'absolute',
  top: '50%',
  bottom: '15px',
  transform: 'translateY(-50%)',
  width: '1px',
  background: '#fff',
  borderRadius: '2px',
  height: 8
});

const trackNavigationBetweenAlerts = () => mixpanel.track('Navigation between alerts');

export const Minimap = React.forwardRef(function MinimapComponent(
  { alerts, alertIndex, alertSeverity, changeAlertIndex, data, options }: MinimapProps,
  ref
) {
  const theme = useTheme();

  const prevAlert = () => {
    changeAlertIndex(prevIndex => prevIndex - 1);
    trackNavigationBetweenAlerts();
  };

  const nextAlert = () => {
    changeAlertIndex(prevIndex => prevIndex + 1);
    trackNavigationBetweenAlerts();
  };

  return (
    <Stack direction="row" justifyContent="space-between" spacing="21px">
      <StyledButton disabled={!alertIndex} onClick={prevAlert}>
        <Rewind fill="#fff" />
      </StyledButton>
      <Box
        sx={{
          borderRadius: '4px',
          border: `1px solid ${alpha(theme.palette.grey[200], 0.5)}`,
          height: 60,
          width: 1,
          position: 'relative'
        }}
      >
        <Line
          data={data}
          options={{
            ...options,
            layout: {
              padding: {
                left: 0,
                right: 0,
                top: 2,
                bottom: 4
              }
            },
            plugins: {
              legend: { display: false },
              tooltip: { enabled: false },
              drawAlertsOnMinimap: {
                activeIndex: alertIndex,
                changeAlertIndex,
                severity: alertSeverity
              }
            },
            scales: {
              x: { display: false },
              y: { display: false, min: options?.scales?.y?.min, max: options?.scales?.y?.max }
            },
            maintainAspectRatio: false
          }}
          plugins={[drawAlertsOnMinimap(alerts)]}
        />
        <StyledArrow
          ref={(elem: HTMLDivElement) => {
            // eslint-disable-next-line no-param-reassign
            (ref as MutableRefObject<HTMLDivElement[]>).current[0] = elem;
          }}
          sx={{
            left: 0
          }}
        />
        <Box
          ref={(elem: HTMLDivElement) => {
            // eslint-disable-next-line no-param-reassign
            (ref as MutableRefObject<HTMLDivElement[]>).current[1] = elem;
          }}
          sx={{
            cursor: 'ew-resize',
            zIndex: 1,
            position: 'absolute',
            top: '-1px',
            bottom: '-1px',
            right: 0,
            border: '#C0D1E1 solid',
            borderWidth: '1px 10px',
            borderRadius: '4px',
            boxSizing: 'border-box',
            boxShadow: '0 0 0 1px #fff, inset 1px 0 0 0 #fff, inset -1px 0 0 0 #fff',
            touchAction: 'pan-x',
            userSelect: 'none',
            WebkitTapHighlightColor: 'rgba(0,0,0,0)'
          }}
        >
          <StyledBoxLine sx={{ left: '-5px' }} />
          <StyledBoxLine sx={{ left: '-7px' }} />
          <Box
            sx={{
              position: 'absolute',
              height: '100%',
              left: '-20px',
              right: '-20px'
            }}
          />
          <StyledBoxLine sx={{ right: '-5px' }} />
          <StyledBoxLine sx={{ right: '-7px' }} />
        </Box>

        <StyledArrow
          ref={(elem: HTMLDivElement) => {
            // eslint-disable-next-line no-param-reassign
            (ref as MutableRefObject<HTMLDivElement[]>).current[2] = elem;
          }}
          sx={{
            right: 0
          }}
        />
      </Box>
      <StyledButton disabled={alertIndex + 1 === alerts.length} onClick={nextAlert}>
        <FastForward fill="#fff" />
      </StyledButton>
    </Stack>
  );
});
