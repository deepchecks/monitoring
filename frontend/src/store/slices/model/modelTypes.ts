import {
  AllDataIngestion,
  Model,
  ModelColumns,
  ModelWithAlerts,
} from "../../../types/model";

export interface InitialStateType {
  allDataIngestion: AllDataIngestion;
  allModels: ModelWithAlerts[];
  columns: ModelColumns;
  model: Model;
  error: string;
  loading: boolean;
}
