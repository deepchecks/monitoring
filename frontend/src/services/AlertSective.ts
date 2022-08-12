import { AxiosResponse } from "axios";
import { $api, ApiBreakpoints } from "../helpers/api";
import { ID } from "../types";
import { AlertsCount } from "../types/alert";

export default class AlertService {
  static async getAlertsCount(): Promise<AxiosResponse<AlertsCount>> {
    return $api(ApiBreakpoints.ALERTS_COUNT);
  }

  static async getAlertsCountById(
    modelId: ID
  ): Promise<AxiosResponse<AlertsCount>> {
    return $api(ApiBreakpoints.ALERTS_COUNT_BY_ID(modelId));
  }
}
