import { MonitorValueConf } from 'api/generated';
import { AnalysisItemFilterTypes } from 'components/AnalysisItem/AnalysisItem.types';
import { SetStateType } from 'helpers/types';

export type SelectSize = 'small' | 'medium';

export interface AnalysisItemSelectProps<T> {
  label: string;
  data?: MonitorValueConf[];
  size?: SelectSize;
  type: AnalysisItemFilterTypes;
  isMostWorstActive: boolean;
  isDriftCheck?: boolean;
  setIsMostWorstActive: SetStateType<boolean>;
  filteredValues: Record<AnalysisItemFilterTypes, string[]>;
  setfilteredValues: SetStateType<Record<AnalysisItemFilterTypes, string[]>>;
}

export type MultiSelectValuesType = string[];
