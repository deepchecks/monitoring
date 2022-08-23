import { Alert, AlertRule, AlertsCount } from "../../../types/alert";

export interface InitialStateType {
  alerts: Alert[];
  alertRule: AlertRule;
  alertRules: AlertRule[];
  error: string;
  loading: boolean;
  count: AlertsCount;
}
