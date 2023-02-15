import { MutableRefObject } from 'react';

import {
  CheckSchema,
  MonitorCheckConfSchema,
  MonitorOptions,
  DataFilter,
  MonitorCheckConf,
  CheckResultSchema
} from 'api/generated';

import { ComparisonModeOptions } from 'context/analysis-context';

export const AGGREGATION_NONE = 'none';

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

export interface AnalysisItemProps {
  check: CheckSchema;
  initialData?: CheckResultSchema;
  checksWithCustomProps?: MutableRefObject<Set<number>>;
  lastUpdate: Date;
  isComparisonModeOn: boolean;
  comparisonMode: ComparisonModeOptions;
  period: [Date, Date];
  frequency: number;
  activeFilters: DataFilter[];
  onPointCLick?: (
    datasetName: string,
    versionName: string,
    timeLabel: number,
    additionalKwargs: MonitorCheckConfSchema | undefined,
    checkInfo: MonitorCheckConf | undefined,
    check: CheckSchema
  ) => void;
  height: number;
  graphHeight: number;
}

export interface RunCheckBody {
  checkId: number;
  data: MonitorOptions;
}
