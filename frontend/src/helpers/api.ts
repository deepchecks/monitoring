import axios from "axios";
import { ID } from "../types";

export const API_URL =
  "http://api-v2-mon-1978135218.eu-west-1.elb.amazonaws.com/api/v1";

export const ApiBreakpoints = {
  ALERT: (alertId: ID) => `/alerts/${alertId}`,
  ALERTS_COUNT: (modelId: ID) => `/models/${modelId}/alerts/count`,
  ALERTS_ALL_COUNT: "/alerts/count",
  ALERT_CREATE: (checkId: ID) => `/checks/${checkId}/alerts`,
  ALERT_DELETE: (alertId: ID) => `/alerts/${alertId}`,
  ALERT_UPDATE: (alertId: ID) => `/alerts/${alertId}`,
  CHECKS: (modelId: ID) => `/models/${modelId}/checks`,
  CHECKS_CREATE: (modelId: ID) => `/models/${modelId}/checks`,
  CHECK_RUN: (checkId: ID) => `/checks/${checkId}/run/`,
  MODEL: (modelId: ID) => `/models/${modelId}`,
  MODELS: "/models/",
  MODELS_DATA_INGESTION: (modelId: ID) => `/models/${modelId}/data-ingestion`,
  MODELS_ALL_DATA_INGESTION: "/models/data-ingestion",
  MODEL_COLUMNS: (modelId: ID) => `/models/${modelId}/columns`,
  MODEL_VERSION: (modelId: ID) => `/models/${modelId}/version`,
  MODEL_VERSION_LOG_DATA: (modelVersionId: ID) =>
    `/model_versions/${modelVersionId}/data`,
  MODEL_VERSION_SAVE_REFERENCE: (modelVersionId: ID) =>
    `/model_versions/${modelVersionId}/reference`,
  MODEL_VERSION_SCHEME_REFERENCE: (modelVersionId: ID) =>
    `/model_versions/${modelVersionId}/scheme`,
  MODEL_VERSION_UPDATE_DATA: (modelVersionId: ID) =>
    `/model_versions/${modelVersionId}/data`,
  MONITOR: (monitorId: ID) => `/monitors/${monitorId}`,
  MONITOR_CREATE: (checkId: ID) => `/checks/${checkId}/monitors`,
  MONITOR_UPDATE: (monitorId: ID) => `/monitors/${monitorId}`,
  MONITOR_DELETE: (monitorId: ID) => `/monitors/${monitorId}`,
};

export const $api = axios.create({
  baseURL: API_URL,
});
