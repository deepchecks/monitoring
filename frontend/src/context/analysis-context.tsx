import React, { createContext, Dispatch, ReactNode, SetStateAction, useMemo, useState } from 'react';

import { timeMap, timeValues } from 'helpers/timeValue';

export type FilterValue = Record<string, boolean> | [number, number] | null;

export type ColumnsFilters = Record<string, FilterValue>;

export interface AnalysisContextValues {
  filters: ColumnsFilters;
  period: [Date, Date];
  frequency: number;
  setFilters: Dispatch<SetStateAction<ColumnsFilters>>;
  setPeriod: Dispatch<SetStateAction<[Date, Date]>>;
  setFrequency: Dispatch<SetStateAction<number>>;
}

interface AnalysisProviderProps {
  children: ReactNode;
}

const INITIAL_DATE: [Date, Date] = [new Date(Date.now() - timeMap.week), new Date()];

export const AnalysisContext = createContext<AnalysisContextValues>({
  filters: {},
  period: INITIAL_DATE,
  frequency: timeValues.day,
  setFilters: () => 1,
  setPeriod: () => 1,
  setFrequency: () => 1
});

export const AnalysisProvider = ({ children }: AnalysisProviderProps) => {
  const [filters, setFilters] = useState<ColumnsFilters>({});
  const [period, setPeriod] = useState<[Date, Date]>(INITIAL_DATE);
  const [frequency, setFrequency] = useState(timeValues.day);

  const value = useMemo(
    () => ({
      period,
      frequency,
      filters,
      setPeriod,
      setFrequency,
      setFilters
    }),
    [filters, period, frequency]
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
};
