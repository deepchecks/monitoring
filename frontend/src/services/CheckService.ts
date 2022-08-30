import { AxiosResponse } from "axios";
import { $api, ApiBreakpoints } from "../helpers/api";
import { ChartResponse, ID } from "../types";
import { Check, RunCheckRequest } from "../types/check";

export default class CheckService {
  static async getChecks(modelId: ID): Promise<AxiosResponse<Check[]>> {
    return $api(ApiBreakpoints.CHECKS(modelId));
  }

  static async createChecks(
    modelId: ID,
    data: Check
  ): Promise<AxiosResponse<Check[]>> {
    return $api.post(ApiBreakpoints.CHECKS_CREATE(modelId), {
      ...data,
    });
  }

  static async runCheck(
    checkID: ID,
    data: RunCheckRequest
  ): Promise<AxiosResponse<ChartResponse>> {
    return $api.post(ApiBreakpoints.CHECK_RUN(checkID), data);
  }

  static async runSuite(
    modelVersionId: ID,
    data: RunCheckRequest
  ): Promise<AxiosResponse<string>> {
    return $api.post(
      ApiBreakpoints.MODEL_VERSION_SUITE_RUN(modelVersionId),
      data
    );
  }
}
