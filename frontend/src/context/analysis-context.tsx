import React, { createContext, Dispatch, ReactNode, SetStateAction, useMemo, useState, useEffect } from 'react';

import { timeMap, timeValues } from 'helpers/time';

export enum ComparisonModeOptions {
  previousPeriod = 'PREVIOUS_PERIOD',
  reference = 'REFERENCE'
}

export type FilterValue = Record<string, boolean> | [number, number] | null;

export type ColumnsFilters = Record<string, FilterValue>;

export interface AnalysisContextValues {
  isComparisonModeOn: boolean;
  comparisonMode: ComparisonModeOptions;
  filters: ColumnsFilters;
  period: [Date, Date];
  frequency: number;
  reset: boolean;
  setIsComparisonModeOn: React.Dispatch<React.SetStateAction<boolean>>;
  setComparisonMode: React.Dispatch<React.SetStateAction<ComparisonModeOptions>>;
  setFilters: Dispatch<SetStateAction<ColumnsFilters>>;
  setPeriod: Dispatch<SetStateAction<[Date, Date]>>;
  setFrequency: Dispatch<SetStateAction<number>>;
  resetAll: () => void;
}

interface AnalysisProviderProps {
  children: ReactNode;
}

const INITIAL_DATE: [Date, Date] = [new Date(Date.now() - timeMap.week), new Date()];

export const AnalysisContext = createContext<AnalysisContextValues>({
  isComparisonModeOn: true,
  comparisonMode: ComparisonModeOptions.previousPeriod,
  filters: {},
  period: INITIAL_DATE,
  frequency: timeValues.day,
  reset: false,
  setIsComparisonModeOn: () => 1,
  setComparisonMode: () => 1,
  setFilters: () => 1,
  setPeriod: () => 1,
  setFrequency: () => 1,
  resetAll: () => 1
});

export const AnalysisProvider = ({ children }: AnalysisProviderProps) => {
  const [isComparisonModeOn, setIsComparisonModeOn] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(ComparisonModeOptions.previousPeriod);
  const [period, setPeriod] = useState(INITIAL_DATE);
  const [frequency, setFrequency] = useState(timeValues.day);
  const [filters, setFilters] = useState<ColumnsFilters>({});
  const [reset, setReset] = useState(false);

  useEffect(() => {
    if (isComparisonModeOn || frequency !== timeValues.day) {
      setReset(true);
      return;
    }

    setReset(false);
  }, [isComparisonModeOn, period, frequency]);

  const resetAll = () => {
    setIsComparisonModeOn(false);
    setComparisonMode(ComparisonModeOptions.previousPeriod);
    // setPeriod(INITIAL_DATE);
    setFrequency(timeValues.day);
    setReset(false);
  };

  const value = useMemo(
    () => ({
      isComparisonModeOn,
      comparisonMode,
      period,
      frequency,
      filters,
      reset,
      setIsComparisonModeOn,
      setComparisonMode,
      setPeriod,
      setFrequency,
      setFilters,
      resetAll
    }),
    [isComparisonModeOn, comparisonMode, filters, period, frequency, reset]
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
};
