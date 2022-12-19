import { MonitorValueConf } from 'api/generated';
import { AnalysisItemFilterTypes } from 'components/AnalysisItem/AnalysisItem.types';
import { SetStateType } from 'helpers/types';

export type SelectSize = 'small' | 'medium';

export interface AnalysisItemSelectProps<T> {
  label: string;
  data?: MonitorValueConf[];
  size?: SelectSize;
  type: AnalysisItemFilterTypes;
  activeFilter: AnalysisItemFilterTypes | null;
  isMostWorstActive: boolean;
  setActiveFilter: SetStateType<AnalysisItemFilterTypes | null>;
  setSelectValue: SetStateType<T>;
  setIsMostWorstActive: SetStateType<boolean>;
}

export type MultiSelectValuesType = string[];
