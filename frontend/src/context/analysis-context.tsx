import React, { createContext, ReactNode, useCallback, useMemo, useState, useEffect } from 'react';

import { timeMap, timeValues } from 'helpers/time';
import { SetStateType } from 'helpers/types';

export enum ComparisonModeOptions {
  previousPeriod = 'PREVIOUS_PERIOD',
  reference = 'REFERENCE'
}

export type FilterValue = Record<string, boolean> | [number, number] | null;

export type ColumnsFilters = Record<string, FilterValue>;

export interface AnalysisContextValues {
  isComparisonModeOn: boolean;
  comparisonMode: ComparisonModeOptions;
  period: [Date, Date];
  lookback: number;
  frequency: number;
  reset: boolean;
  filters: ColumnsFilters;
  filtersLength: number;
  setIsComparisonModeOn: SetStateType<boolean>;
  setComparisonMode: SetStateType<ComparisonModeOptions>;
  setLookback: SetStateType<number>;
  setPeriod: SetStateType<[Date, Date]>;
  setFrequency: SetStateType<number>;
  setFilters: SetStateType<ColumnsFilters>;
  setInitialFilters: SetStateType<ColumnsFilters>;
  resetAll: () => void;
}

interface AnalysisProviderProps {
  children: ReactNode;
}

export const lookBackData = [
  { label: 'Last 7 Days', value: timeMap.week },
  { label: 'Last 30 Days', value: timeMap.month }
];

const INITIAL_DATE: [Date, Date] = [new Date(Date.now() - timeMap.week), new Date()];
const INITIAL_LOOKBACK = lookBackData[0].value;

export const AnalysisContext = createContext<AnalysisContextValues>({
  isComparisonModeOn: true,
  comparisonMode: ComparisonModeOptions.previousPeriod,
  period: INITIAL_DATE,
  lookback: INITIAL_LOOKBACK,
  frequency: timeValues.day,
  reset: false,
  filters: {},
  filtersLength: 0,
  setIsComparisonModeOn: () => 1,
  setComparisonMode: () => 1,
  setPeriod: () => 1,
  setLookback: () => 1,
  setFrequency: () => 1,
  resetAll: () => 1,
  setFilters: () => 1,
  setInitialFilters: () => 1
});

export const AnalysisProvider = ({ children }: AnalysisProviderProps) => {
  const [isComparisonModeOn, setIsComparisonModeOn] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(ComparisonModeOptions.previousPeriod);

  const [lookback, setLookback] = useState(INITIAL_LOOKBACK);
  const [period, setPeriod] = useState(INITIAL_DATE);

  const [frequency, setFrequency] = useState(timeValues.day);

  const [initialFilters, setInitialFilters] = useState<ColumnsFilters>({});
  const [filters, setFilters] = useState<ColumnsFilters>({});
  const [filtersLength, setFiltersLength] = useState(0);

  const [reset, setReset] = useState(false);

  useEffect(() => {
    let length = 0;

    Object.values(filters).forEach(value => {
      if (value && Array.isArray(value)) {
        return value && length++;
      } else if (value) {
        Object.values(value).forEach(v => v && length++);
      }
    });

    setFiltersLength(length);
  }, [filters]);

  useEffect(() => {
    if (isComparisonModeOn || frequency !== timeValues.day || filtersLength > 0) {
      setReset(true);
      return;
    }

    setReset(false);
  }, [isComparisonModeOn, period, lookback, frequency, filtersLength]);

  const resetAll = useCallback(() => {
    setIsComparisonModeOn(false);
    setComparisonMode(ComparisonModeOptions.previousPeriod);
    // setLookback(INITIAL_LOOKBACK);
    // setPeriod(INITIAL_DATE);
    setFrequency(timeValues.day);
    setFiltersLength(0);
    setFilters(initialFilters);
    setReset(false);
  }, [initialFilters]);

  const value = useMemo(
    () => ({
      isComparisonModeOn,
      comparisonMode,
      period,
      lookback,
      frequency,
      filters,
      filtersLength,
      reset,
      setIsComparisonModeOn,
      setComparisonMode,
      setPeriod,
      setLookback,
      setFrequency,
      setFilters,
      setInitialFilters,
      resetAll
    }),
    [comparisonMode, filters, filtersLength, frequency, isComparisonModeOn, lookback, period, reset, resetAll]
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
};
