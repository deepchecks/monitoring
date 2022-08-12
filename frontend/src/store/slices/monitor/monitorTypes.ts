import { ChartData } from "chart.js";
import { ID } from "../../../types";
import { DashboardType, Monitor, MonitorRequest } from "../../../types/monitor";

export interface InitialStateType {
  charts: ChartData<"line">[];
  dashboards: DashboardType;
  error: string;
  loading: boolean;
  monitor: Monitor;
  graph: ChartData<"line">;
}

export interface CreateMonitorOptions {
  checkId: ID;
  monitor: MonitorRequest;
}

export interface UpdateMonitorOptions {
  checkId: ID;
  monitor: MonitorRequest;
}
