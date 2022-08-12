import { ChartData } from "chart.js";
import { ID } from "../../../types";
import { Check, CheckGraph, RunCheckRequest } from "../../../types/check";

export interface InitialStateType {
  charts: CheckGraph[];
  checks: Check[];
  error: string;
  loading: boolean;
  graph: ChartData<"line">;
}

export interface RunCheckOptions {
  checkId: ID;
  data: RunCheckRequest;
}

export interface CreateCheckOptions {
  modelId: ID;
  data: Check;
}
