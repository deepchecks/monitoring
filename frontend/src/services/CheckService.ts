import { AxiosResponse } from "axios";
import { $api, ApiBreakpoints } from "../helpers/api";
import { ID } from "../types";
import { Check, CheckGraph, RunCheckRequest } from "../types/check";

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
  ): Promise<AxiosResponse<CheckGraph>> {
    return $api.post(ApiBreakpoints.CHECK_RUN(checkID), { ...data });
  }
}
