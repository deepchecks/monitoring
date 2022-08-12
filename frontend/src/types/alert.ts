export type AlertTypes = "low" | "mid" | "high" | "critical";

export type AlertsCount = {
  [key in AlertTypes]: number;
};
