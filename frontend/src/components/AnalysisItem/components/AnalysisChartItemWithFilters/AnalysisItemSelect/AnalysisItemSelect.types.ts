import { AnalysisItemFilterTypes } from 'components/AnalysisItem/AnalysisItem.types';
import { SetStateType } from 'helpers/types';

export interface FiltersValue {
  name: string;
  is_agg: boolean | null;
}

export type SelectSize = 'small' | 'medium';

export interface AnalysisItemSelectProps<T> {
  label: string;
  data: FiltersValue[];
  size?: SelectSize;
  type: AnalysisItemFilterTypes;
  activeFilter: AnalysisItemFilterTypes | null;
  isMostWorstActive: boolean;
  setActiveFilter: SetStateType<AnalysisItemFilterTypes | null>;
  setSelectValue: SetStateType<T>;
  setIsMostWorstActive: SetStateType<boolean>;
}

export type MultiSelectValuesType = string[];
