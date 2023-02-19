import { CheckSchema, MonitorCheckConfSchema } from 'api/generated';
import { DrawerProps } from '@mui/material';
import { CheckType } from 'helpers/types/check';

export interface ClassOrFeature {
  type: string;
  value: string;
}

export interface AnalysisGroupByProps extends DrawerProps {
  modelName: string;
  datasetName: string | null;
  check: CheckSchema | null;
  modelVersionId: number | null;
  timeLabel: number | null;
  additionalKwargs: MonitorCheckConfSchema | null;
  onCloseIconClick: () => void;
  type: CheckType;
}

export type Features = Record<string, 'numeric' | 'categorical'>;

export interface FeaturesResponse {
  features: Features;
  feature_importance: Record<string, number>;
}
