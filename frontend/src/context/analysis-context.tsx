import React, { createContext, Dispatch, ReactNode, SetStateAction, useMemo, useState } from 'react';

import { timeMap, timeValues } from 'helpers/timeValue';

export type FilterValue = Record<string, boolean> | [number, number] | null;

export type ColumnsFilters = Record<string, FilterValue>;

export interface AnalysisContextValues {
  referencePreviousPeriod: boolean;
  filters: ColumnsFilters;
  period: [Date, Date];
  frequency: number;
  setReferencePreviousPeriod: React.Dispatch<React.SetStateAction<boolean>>;
  setFilters: Dispatch<SetStateAction<ColumnsFilters>>;
  setPeriod: Dispatch<SetStateAction<[Date, Date]>>;
  setFrequency: Dispatch<SetStateAction<number>>;
}

interface AnalysisProviderProps {
  children: ReactNode;
}

const INITIAL_DATE: [Date, Date] = [new Date(Date.now() - timeMap.week), new Date()];

export const AnalysisContext = createContext<AnalysisContextValues>({
  referencePreviousPeriod: true,
  filters: {},
  period: INITIAL_DATE,
  frequency: timeValues.day,
  setReferencePreviousPeriod: () => 1,
  setFilters: () => 1,
  setPeriod: () => 1,
  setFrequency: () => 1
});

export const AnalysisProvider = ({ children }: AnalysisProviderProps) => {
  const [referencePreviousPeriod, setReferencePreviousPeriod] = useState(true);
  const [filters, setFilters] = useState<ColumnsFilters>({});
  const [period, setPeriod] = useState<[Date, Date]>(INITIAL_DATE);
  const [frequency, setFrequency] = useState(timeValues.day);

  const value = useMemo(
    () => ({
      referencePreviousPeriod,
      period,
      frequency,
      filters,
      setReferencePreviousPeriod,
      setPeriod,
      setFrequency,
      setFilters
    }),
    [referencePreviousPeriod, filters, period, frequency]
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
};
