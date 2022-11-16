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
  type: string;
  activeFilter: string | null;
  setActiveFilter: SetStateType<string | null>;
  setSelectValue: SetStateType<T>;
}

export type MultiSelectValuesType = string[];
