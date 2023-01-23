import { CheckConfigSchemaParams, MonitorValueConf } from 'api/generated';
import { AnalysisItemFilterTypes, FilteredValues } from 'components/AnalysisItem/AnalysisItem.types';
import { SetStateType } from 'helpers/types';

export type SelectSize = 'small' | 'medium';

export interface AnalysisItemSelectProps {
  label: string;
  data?: MonitorValueConf[];
  size?: SelectSize;
  type: AnalysisItemFilterTypes;
  isMostWorstActive: boolean;
  isDriftCheck?: boolean;
  setIsMostWorstActive: SetStateType<boolean>;
  filteredValues: FilteredValues;
  setFilteredValues: SetStateType<FilteredValues>;
  checkParams: CheckConfigSchemaParams;
}

export type MultiSelectValuesType = string[];
