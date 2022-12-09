import { GetModelColumnsApiV1ModelsModelIdColumnsGet200 } from '../../api/generated';

export interface Model {
  latest_time: number;
  alerts_count: number;
  id: number | string;
  description?: string;
  name: string;
  task_type?: string;
}

export enum ColumnType {
  categorical = 'categorical',
  numeric = 'numeric',
  integer = 'integer'
}

export interface ColumnStatsCategorical {
  values: string[];
}

export interface ColumnStatsNumeric {
  min: number;
  max: number;
}

export interface Categorical {
  type: ColumnType.categorical;
  stats: {
    values: string[];
  };
}

export interface Numeric {
  type: ColumnType.numeric;
  min: number;
  max: number;
}

export interface ModelColumns {
  [key: string]: Categorical | Numeric;
}

// @FIXME all places using ModelColumns should be refactored to ColumnsSchema
export type ColumnsSchema = GetModelColumnsApiV1ModelsModelIdColumnsGet200;

export interface DataIngestion {
  count: number;
  day: number;
}

export interface AllDataIngestion {
  [key: string]: DataIngestion[];
}
