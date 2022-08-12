import { ID } from ".";

export interface Filter {
  column: string;
  operator: string;
  value: string | number;
}

export interface Monitor {
  id: ID;
  name: string;
  check: {
    config: {
      class_name: string;
      module_name: string;
      params: {
        reduce: string;
      };
    };
    model_id: number;
    id: number;
    name: string;
  };
  lookback: number;
  description?: string;
  dashboard_id: number;
  data_filter: {
    filters: Filter[];
  };
}

export interface MonitorRequest {
  name: string;
  lookback: number;
  description?: string;
  data_filter?: {
    filters: Filter[];
  };
  dashboard_id?: number;
}

export interface DashboardType {
  id: ID;
  name: string;
  monitors: Monitor[];
}
