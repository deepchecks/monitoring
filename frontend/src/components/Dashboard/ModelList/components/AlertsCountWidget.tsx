import React from 'react';

import { Stack } from '@mui/material';

import { AlertCount, SEVERITY } from 'components/Alerts/AlertCount';
import { SelectedModelAlerts } from '../ModelList';

interface AlertsCountWidgetProps {
  selectedModelAlerts: SelectedModelAlerts | null;
}

export const AlertsCountWidget = ({ selectedModelAlerts }: AlertsCountWidgetProps) => {
  return (
    <Stack spacing="16px" direction="row">
      <AlertCount count={selectedModelAlerts?.critical || 0} severity={SEVERITY.CRITICAL} showText={false} />
      <AlertCount count={selectedModelAlerts?.high || 0} severity={SEVERITY.HIGH} showText={false} />
      <AlertCount count={selectedModelAlerts?.medium || 0} severity={SEVERITY.MEDIUM} showText={false} />
      <AlertCount count={selectedModelAlerts?.low || 0} severity={SEVERITY.LOW} showText={false} />
    </Stack>
  );
};
