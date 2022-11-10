import { Dispatch, SetStateAction } from 'react';

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
  setActiveFilter: Dispatch<SetStateAction<string | null>>;
  setSelectValue: Dispatch<SetStateAction<T>>;
}
