import { ChartResponse, ID } from "../../../types";
import { DashboardType, Monitor, MonitorRequest } from "../../../types/monitor";

export interface InitialStateType {
  charts: ChartResponse[];
  dashboards: DashboardType;
  error: string;
  loading: boolean;
  monitor: Monitor;
  graph: ChartResponse;
}

export interface CreateMonitorOptions {
  checkId: ID;
  monitor: MonitorRequest;
}

export interface UpdateMonitorOptions {
  monitorId: ID;
  monitor: MonitorRequest;
}
