export type ID = number | string;

export interface ChartResponse {
  output: {
    [key: string]: { [key: string]: number | null }[];
  };
  time_labels: string[];
}

export interface Filter {
  column: string;
  operator: string;
  value: string | number;
}

export type GraphData =
  | (number | null)[]
  | string[]
  | { x: string; y: number }[];
