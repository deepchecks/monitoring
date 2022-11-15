import React from 'react';
import mixpanel from 'mixpanel-browser';

import { useCountAlertsApiV1AlertsCountActiveGet } from '../api/generated';

import { Box, Button, Stack, useTheme } from '@mui/material';

import { AlertCount, SEVERITY } from './AlertCount';

import { PlusIcon } from '../assets/icon/icon';

import { DrawerNames, DrawerNamesMap } from './MonitorDrawer/MonitorDrawer.types';

import { colors } from 'theme/colors';

interface DashboardHeaderProps {
  onOpen: (monitorName: DrawerNames) => void;
}

export const DashboardHeader = ({ onOpen }: DashboardHeaderProps) => {
  const { data } = useCountAlertsApiV1AlertsCountActiveGet();
  const theme = useTheme();

  const handleClick = () => {
    mixpanel.track('Click on Add monitor');
    onOpen(DrawerNamesMap.CreateMonitor);
  };

  return (
    <>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '20px 0',
          justifyContent: 'space-between',
          height: '100px',
          width: '100%',
          marginBottom: '35px',
          borderBottom: theme => `1px dashed ${theme.palette.text.disabled}`
        }}
      >
        <Box
          component="h2"
          sx={{
            color: '#94a4ad'
          }}
        >
          Dashboard
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Stack spacing="20px" alignItems="center" direction="row">
            <AlertCount count={data?.critical ? data.critical : 0} severity={SEVERITY.CRITICAL} />
            <AlertCount count={data?.high ? data.high : 0} severity={SEVERITY.HIGH} />
          </Stack>
          <Box
            sx={{
              backgroundColor: theme => theme.palette.grey[200],
              margin: '0 20px 0 30px',
              height: '42px',
              width: '1px'
            }}
          />
          <Box onClick={handleClick}>
            <Button
              sx={{
                padding: '11px 8px',
                color: colors.primary.violet[400],
                fontSize: '14px',
                lineHeight: '17px',
                fontWeight: 400,
                '& .MuiButton-startIcon': {
                  mr: '4px'
                }
              }}
              variant="text"
              startIcon={<PlusIcon fill={theme.palette.primary.main} />}
            >
              Add Monitor
            </Button>
          </Box>
        </Box>
      </Box>
    </>
  );
};
