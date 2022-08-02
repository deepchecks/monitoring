import { AxiosResponse } from "axios";
import { $api, ApiBreakpoints } from "../helpers/api";
import { ID } from "../types";
import { Monitor } from "../types/monitor";

export default class MonitorService {
  static async getMonitor(monitorId: ID): Promise<AxiosResponse<Monitor>> {
    return $api(ApiBreakpoints.MONITOR(monitorId));
  }

  static async createMonitor(
    checkId: ID,
    monitor: Monitor
  ): Promise<AxiosResponse<{ id: number | string }>> {
    return $api.post<{ id: string }>(ApiBreakpoints.MONITOR_CREATE(checkId), {
      ...monitor,
    });
  }

  static async updateMonitor(
    checkId: ID,
    monitor: Monitor
  ): Promise<AxiosResponse<{ id: number | string }>> {
    return $api.put<{ id: string }>(ApiBreakpoints.MONITOR_UPDATE(checkId), {
      ...monitor,
    });
  }

  static async deleteMonitor(monitorID: ID) {
    return $api.delete<{ id: string }>(
      ApiBreakpoints.MONITOR_DELETE(monitorID)
    );
  }
}
