import { ID } from "../../../types";
import { AllDataIngestion, Model, ModelColumns } from "../../../types/model";

export interface ModelsMap {
  [key: ID]: Model;
}

export interface InitialStateType {
  allDataIngestion: AllDataIngestion;
  allModels: Model[];
  columns: ModelColumns;
  model: Model;
  modelsMap: ModelsMap;
  error: string;
  loading: boolean;
}

export interface GetModelsReturn {
  models: Model[];
  modelsMap: ModelsMap;
}
