import { CheckConfigSchemaParams, MonitorValueConf } from 'api/generated';
import { CheckFilterTypes, FilteredValues } from 'helpers/utils/checkUtil';
import { SetStateType } from 'helpers/types';

export type SelectSize = 'small' | 'medium';

export interface AnalysisItemSelectProps {
  label: string;
  data?: MonitorValueConf[];
  size?: SelectSize;
  type: CheckFilterTypes;
  isMostWorstActive: boolean;
  isDriftCheck?: boolean;
  setIsMostWorstActive: SetStateType<boolean>;
  filteredValues: FilteredValues;
  setFilteredValues: SetStateType<FilteredValues>;
  checkParams: CheckConfigSchemaParams;
}

export type MultiSelectValuesType = string[];
