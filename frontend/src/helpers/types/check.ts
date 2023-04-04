import { ID, Filter } from '.';

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

export enum CheckTypeOptions {
  Feature = 'Feature',
  Class = 'Class'
}

export type CheckType = CheckTypeOptions.Feature | CheckTypeOptions.Class | null;
