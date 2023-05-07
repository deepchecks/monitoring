import React from 'react';
import { Stack, Box } from '@mui/material';
import { useCountAlertsApiV1AlertsCountActiveGet } from '../../api/generated';
import { AlertCount, SEVERITY } from './AlertCount';

export const AlertHeader = () => {
  const { data } = useCountAlertsApiV1AlertsCountActiveGet();
  return (
    <>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '20px 48px 20px 0',
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
          Alerts
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
        </Box>
      </Box>
    </>
  );
};
