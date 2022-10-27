import { timeMap } from 'helpers/timeValue';
import React, { createContext, Dispatch, FC, SetStateAction, useMemo, useState } from 'react';

export type FilterValue = Record<string, boolean> | [number, number] | null;

export type ColumnsFilters = Record<string, FilterValue>;

export interface AnalysisContextValues {
  filters: ColumnsFilters;
  period: [Date, Date];
  setFilters: Dispatch<SetStateAction<ColumnsFilters>>;
  setPeriod: Dispatch<SetStateAction<[Date, Date]>>;
}

const initDate: [Date, Date] = [new Date(Date.now() - timeMap.week), new Date()];

export const AnalysisContext = createContext<AnalysisContextValues>({
  filters: {},
  period: initDate,
  setFilters: () => 1,
  setPeriod: () => 1
});

export const AnalysisProvider: FC<{ children: JSX.Element }> = ({ children }) => {
  const [filters, setFilters] = useState<ColumnsFilters>({});
  const [period, setPeriod] = useState<[Date, Date]>(initDate);

  const value = useMemo(
    () => ({
      period,
      filters,
      setPeriod,
      setFilters
    }),
    [filters, period, setFilters, setPeriod]
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
};
