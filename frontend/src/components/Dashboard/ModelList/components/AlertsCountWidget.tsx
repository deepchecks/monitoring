import React from 'react';

import { useCountAlertsApiV1AlertsCountActiveGet } from 'api/generated';

import { Stack } from '@mui/material';

import { AlertCount, SEVERITY } from 'components/Alerts/AlertCount';
import { SelectedModelAlerts } from '../ModelList';

interface AlertsCountWidgetProps {
  selectedModelAlerts: SelectedModelAlerts | null;
}

export const AlertsCountWidget = ({ selectedModelAlerts }: AlertsCountWidgetProps) => {
  const { data: totalAlerts } = useCountAlertsApiV1AlertsCountActiveGet();
  const data = selectedModelAlerts || totalAlerts;

  return (
    <Stack spacing="16px" direction="row">
      <AlertCount count={data?.critical || 0} severity={SEVERITY.CRITICAL} showText={false} />
      <AlertCount count={data?.high || 0} severity={SEVERITY.HIGH} showText={false} />
      <AlertCount count={data?.medium || 0} severity={SEVERITY.MEDIUM} showText={false} />
      <AlertCount count={data?.low || 0} severity={SEVERITY.LOW} showText={false} />
    </Stack>
  );
};
