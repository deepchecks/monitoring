import React, { createContext, ReactNode, useState } from 'react';

import { AlertRuleSchema, MonitorSchema, OperatorsEnum } from 'api/generated';
import { SetStateType } from 'helpers/types';

export interface AlertRuleContextValues {
  alertRule: AlertRuleSchema;
  monitor: MonitorSchema;
  setAlertRule: SetStateType<AlertRuleSchema>;
  setMonitor: SetStateType<MonitorSchema>;
  resetState: () => void;
}

interface AlertRuleProviderProps {
  children: ReactNode;
}

const initialAlertRule = {
  alert_severity: undefined,
  condition: {
    operator: OperatorsEnum.greater_than_equals,
    value: 0
  }
} as AlertRuleSchema;

const initialMonitor = {
  name: '',
  lookback: 86400 * 7,
  check: {
    id: 0,
    model_id: 0
  },
  frequency: 86400,
  aggregation_window: 86400,
  data_filters: {
    filters: [
      {
        column: '',
        operator: OperatorsEnum.greater_than_equals,
        value: ''
      }
    ]
  },
  dashboard_id: 1
} as MonitorSchema;

export const AlertRuleDialogContext = createContext<AlertRuleContextValues>({
  alertRule: initialAlertRule,
  setAlertRule: () => 1,
  monitor: initialMonitor,
  setMonitor: () => 1,
  resetState: () => 1
});

export const AlertRuleDialogProvider = ({ children }: AlertRuleProviderProps) => {
  const [alertRule, setAlertRule] = useState(initialAlertRule);
  const [monitor, setMonitor] = useState(initialMonitor);

  const resetState = () => {
    setAlertRule(initialAlertRule);
    setMonitor(initialMonitor);
  };

  const value: AlertRuleContextValues = {
    alertRule: alertRule,
    setAlertRule: setAlertRule,
    monitor: monitor,
    setMonitor: setMonitor,
    resetState: resetState
  };

  return <AlertRuleDialogContext.Provider value={value}>{children}</AlertRuleDialogContext.Provider>;
};
