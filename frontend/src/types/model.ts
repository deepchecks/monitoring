export interface Model {
  latest_time: number;
  alerts_count: number;
  id: number | string;
  description?: string;
  name: string;
  task_type?: string;
}

export enum ColumnType {
  string = "categorical",
  number = "numeric",
}

export interface Categorical {
  type: ColumnType.string;
  values: [string, string];
}

export interface Numeric {
  type: ColumnType.number;
  min: number;
  max: number;
}

export interface ModelColumns {
  [key: string]: Categorical | Numeric;
}

export interface DataIngestion {
  count: number;
  day: number;
}

export interface AllDataIngestion {
  [key: string]: DataIngestion[];
}
