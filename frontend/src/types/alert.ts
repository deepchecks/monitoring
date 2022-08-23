import { ID } from ".";

export type Criticality = "low" | "mid" | "high" | "critical";

export interface Alert {
  id: ID;
  alert_rule_id: ID;
  failed_values: {
    [key: string]: string[];
  };
  start_time: Date | string;
  end_time: Date | string;
  resolved: boolean;
  created_at: Date | string;
}

export interface AlertRule {
  id: ID;
  name: string;
  monitor_id: ID;
  repeat_every: number;
  condition: {
    operator: "greater_than_equals";
    value: 0;
  };
  alert_severity: Criticality;
  alerts_count: 0;
}

export type AlertsCount = {
  [key in Criticality]: number;
};
