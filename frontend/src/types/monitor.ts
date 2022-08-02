export interface Monitor {
  id?: number | string;
  name: string;
  check_id?: number;
  lookback: number;
  description?: string;
  data_filter?: {
    column: string;
    operator: string;
    value: string | number;
  };
}
