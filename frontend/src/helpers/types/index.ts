export type ID = number | string;

export interface Filter {
  column: string;
  operator: string;
  value: string | number;
}

export interface ChartResponse {
  output: {
    [key: string]: { [key: string]: number | null }[];
  };
  time_labels: string[];
}

export type GraphData = (number | null)[] | string[] | { x: string; y: number }[] | { x: number; y: number }[];

export type WindowTimeout = ReturnType<typeof setTimeout>;
export type WindowInterval = ReturnType<typeof setInterval>;

export type SetStateType<T> = React.Dispatch<React.SetStateAction<T>>;

export type SelectValues = string | number | undefined;
