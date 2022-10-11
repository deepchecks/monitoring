import { Dispatch, SetStateAction } from 'react';

import { MonitorSchema } from 'api/generated';
import { LookbackCheckProps } from '../MonitorDrawer.types';

export interface MonitorFormProps {
  monitor?: MonitorSchema;
  onClose: () => void | undefined;
  resetMonitor: boolean;
  runCheckLookback: (props: LookbackCheckProps) => void;
  setResetMonitor: Dispatch<SetStateAction<boolean>>;
}

export interface DeleteMonitorProps {
  monitor?: MonitorSchema;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onClick: (confirm: boolean) => void;
}
