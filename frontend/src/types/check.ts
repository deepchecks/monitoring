import { ID } from ".";

export interface Check {
  config: {
    class_name: string;
    module_name: string;
    params: object;
  };
  model_id: number;
  id: ID;
  name?: string;
}

export interface RunCheckRequest {
  lookback: number;
  filter: {
    column: string;
    operator: string;
    value: string | number;
  };
}

export interface CheckGraph {
  output: {
    3: [];
  };
  time_labels: string[];
}
