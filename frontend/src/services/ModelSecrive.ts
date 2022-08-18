import { AxiosResponse } from "axios";
import { $api, ApiBreakpoints } from "../helpers/api";
import { ID } from "../types";
import { AllDataIngestion, Model, ModelColumns } from "../types/model";

export default class ModelService {
  static async getModels(): Promise<AxiosResponse<Model[]>> {
    return $api(ApiBreakpoints.MODELS);
  }

  static async getColums(modelId: ID): Promise<AxiosResponse<ModelColumns>> {
    return $api(ApiBreakpoints.MODEL_COLUMNS(modelId));
  }

  static async getAllDataIntestion(
    timeFilter: number
  ): Promise<AxiosResponse<AllDataIngestion>> {
    return $api(ApiBreakpoints.MODELS_ALL_DATA_INGESTION(timeFilter));
  }
}
