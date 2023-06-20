import { MonitorSchema, MonitorOptions } from 'api/generated';

import { StackProps } from '@mui/material';

import { SelectValues, SetStateType } from 'helpers/types';
import { FilteredValues } from 'helpers/utils/checkUtil';

export interface MonitorFormProps extends StackProps {
  activeStep: number;
  monitor: MonitorSchema | null;
  setMonitorToRefreshId: SetStateType<number | null>;
  runCheckLookBack: (checkId: SelectValues, data: MonitorOptions) => Promise<void>;
  handleCloseDialog: () => void;
  isDialogOpen: boolean;
  refetchMonitors(): void;
  setGraphFrequency: SetStateType<SelectValues>;
  selectedModelId: number | null;
  reset: boolean;
  setReset: SetStateType<boolean>;
  setSubmitButtonDisabled: SetStateType<boolean>;
}

export interface InitialState {
  frequency: SelectValues;
  monitorName: string;
  model: SelectValues;
  check: SelectValues;
  filteredValues: FilteredValues;
  resConf: string | undefined;
  aggregationWindow: number;
  lookBack: SelectValues;
  column: string | undefined;
  category: SelectValues;
  numericValue: number[] | undefined;
}
