import { ID } from ".";
import { Filter } from "./monitor";

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
    filters: Filter[];
  };
}

export interface CheckGraph {
  output: {
    3: [];
  };
  time_labels: string[];
}
