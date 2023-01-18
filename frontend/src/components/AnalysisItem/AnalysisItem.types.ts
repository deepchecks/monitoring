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
  label?: string | undefined;
  borderColor?: string | undefined;
  pointBorderColor?: string | undefined;
  pointBackgroundColor?: string | undefined;
  pointHoverBackgroundColor?: string | undefined;
  pointHoverBorderColor?: string | undefined;
  hidden?: boolean | undefined;
  dashed?: boolean | undefined;
  data: (number | null)[];
}
