import { AxiosResponse } from "axios";
import { $api, ApiBreakpoints } from "../helpers/api";
import { Model } from "../types/model";

export default class ModelService {
  static async getModels(): Promise<AxiosResponse<Model[]>> {
    return $api(ApiBreakpoints.MODELS);
  }

  static async getColums(
    modelId: number | string
  ): Promise<AxiosResponse<Model[]>> {
    return $api(ApiBreakpoints.MODEL_COLUMNS(modelId));
  }
}
