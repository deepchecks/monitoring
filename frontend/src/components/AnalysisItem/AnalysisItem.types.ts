export const AGGREGATION_NONE = 'none';

export enum AnalysisItemFilterTypes {
  AGGREGATION = 'aggregation method',
  FEATURE = 'feature',
  SCORER = 'scorer'
}

export const TypeMap = {
  [AnalysisItemFilterTypes.AGGREGATION]: 'aggregation_method',
  [AnalysisItemFilterTypes.FEATURE]: 'features',
  [AnalysisItemFilterTypes.SCORER]: 'scorers'
}

export interface IDataset {
  id: string;
  label?: string;
  borderColor?: string;
  pointBorderColor?: string | string[];
  pointBackgroundColor?: string | string[];
  pointHoverBackgroundColor?: string;
  pointHoverBorderColor?: string;
  hidden?: boolean;
  dashed?: boolean;
  data: (number | null)[];
}
