import { Dispatch, SetStateAction } from 'react';

import { MonitorSchema } from 'api/generated';
import { LookbackCheckProps } from '../../MonitorDrawer.types';

export interface MonitorFormProps {
  monitor?: MonitorSchema;
  onClose: () => void | undefined;
  resetMonitor: boolean;
  runCheckLookback: (graphData: LookbackCheckProps) => Promise<void>;
  setResetMonitor: Dispatch<SetStateAction<boolean>>;
  setMonitorToRefreshId: React.Dispatch<React.SetStateAction<number | null>>;
}
