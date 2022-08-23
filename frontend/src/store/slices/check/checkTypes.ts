import { ChartResponse, ID } from "../../../types";
import { Check, RunCheckRequest } from "../../../types/check";

export interface InitialStateType {
  charts: ChartResponse[];
  checks: Check[];
  error: string;
  loading: boolean;
  graph: ChartResponse;
}

export interface RunCheckOptions {
  checkId: ID;
  data: RunCheckRequest;
}

export interface CreateCheckOptions {
  modelId: ID;
  data: Check;
}

export interface RunSuiteOptions {
  modelVersionId: ID;
  data: RunCheckRequest;
}
