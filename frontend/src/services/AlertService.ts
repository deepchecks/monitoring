import { AxiosResponse } from "axios";
import { $api, ApiBreakpoints } from "../helpers/api";
import { ID } from "../types";
import {
  Alert,
  AlertRule,
  AlertRulesParams,
  AlertsCount,
} from "../types/alert";

export default class AlertService {
  static async getAlertRules(
    options: AlertRulesParams = {} as AlertRulesParams
  ): Promise<AxiosResponse<AlertRule[]>> {
    const params = new URLSearchParams();

    if (Object.keys(options).length) {
      Object.entries(options).forEach(([key, value]) => {
        params.append(key, value);
      });
    }

    return $api(ApiBreakpoints.ALERT_RULES, { params });
  }

  static async getAlertsByAlertRuleId(
    alertRuleId: ID
  ): Promise<AxiosResponse<Alert[]>> {
    return $api(ApiBreakpoints.ALERT_RULES_ALERTS(alertRuleId));
  }

  static async getAlertsCount(): Promise<AxiosResponse<AlertsCount>> {
    return $api(ApiBreakpoints.ALERTS_ACTIVE_COUNT);
  }

  static async getAlertsCountById(
    modelId: ID
  ): Promise<AxiosResponse<AlertsCount>> {
    return $api(ApiBreakpoints.ALERT_RULES_COUNT_BY_ID(modelId));
  }

  static async resolveAllAlerts(
    alertRuleId: ID
  ): Promise<AxiosResponse<AlertRule[]>> {
    return $api.post(
      ApiBreakpoints.ALERT_RULES_RESOLVE_ALL_ALERTS(alertRuleId)
    );
  }

  static async resolveAlert(alertId: ID): Promise<AxiosResponse<AlertRule[]>> {
    return $api.post(ApiBreakpoints.ALERT_RULES_RESOLVE_ALERT(alertId));
  }
}
