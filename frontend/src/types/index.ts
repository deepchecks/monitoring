export type ID = number | string;

export interface ChartResponse {
  output: {
    [key: string]: { [key: string]: number }[];
  };
  time_labels: string[];
}

export interface Filter {
  column: string;
  operator: string;
  value: string | number;
}
