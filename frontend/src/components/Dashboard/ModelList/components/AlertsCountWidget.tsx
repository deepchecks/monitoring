import React from 'react';

import { useCountAlertsApiV1AlertsCountActiveGet } from 'api/generated';

import { Stack } from '@mui/material';

import { AlertCount, SEVERITY } from 'components/AlertCount';

export const AlertsCountWidget = () => {
  const { data } = useCountAlertsApiV1AlertsCountActiveGet();

  return (
    <Stack width="190px" justifyContent="space-between" direction="row">
      <AlertCount count={data?.critical || 0} severity={SEVERITY.CRITICAL} />
      <AlertCount count={data?.high || 0} severity={SEVERITY.HIGH} />
    </Stack>
  );
};
