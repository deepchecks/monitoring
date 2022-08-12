import { AlertsCount } from "../../../types/alert";

export interface InitialStateType {
  error: string;
  loading: boolean;
  count: AlertsCount;
}
