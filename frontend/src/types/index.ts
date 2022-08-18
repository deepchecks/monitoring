export type ID = number | string;

export interface ChartResponse {
  output: {
    [key: string]: { [key: string]: number }[];
  };
  time_labels: string[];
}
