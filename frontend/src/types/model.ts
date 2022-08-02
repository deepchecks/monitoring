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
