export interface Model {
  id: number | string;
  description?: string;
  name: string;
  task_type?: string;
}

export interface ModelColumns {
  a: {
    type: string;
    values: [number, number];
  };
  b: {
    type: string;
    values: [string, string];
  };
}

export interface DataIngestion {
  count: number;
  day: number;
}

export interface AllDataIngestion {
  [key: string]: DataIngestion[];
}

export type ModelWithAlerts = Model & { count: number };
