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
  start_time: Date | string;
  end_time: Date | string;
  filter?: {
    filters: Filter[];
  };
}
