import { AllDataIngestion, Model, ModelColumns } from "../../../types/model";

export interface InitialStateType {
  allDataIngestion: AllDataIngestion;
  allModels: Model[];
  columns: ModelColumns;
  model: Model;
  error: string;
  loading: boolean;
}
