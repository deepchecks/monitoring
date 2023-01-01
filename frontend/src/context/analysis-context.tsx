import React, { createContext, ReactNode, useCallback, useMemo, useState, useEffect } from 'react';

import { DataFilter } from 'api/generated';

import { timeMap, timeValues } from 'helpers/time';
import { SetStateType } from 'helpers/types';
import { OperatorsMap } from 'helpers/conditionOperator';

export enum ComparisonModeOptions {
  previousPeriod = 'PREVIOUS_PERIOD',
  reference = 'REFERENCE'
}

export type FilterValue = Record<string, boolean> | [number, number] | null;

export type ColumnsFilters = Record<string, FilterValue>;

export interface AnalysisContextValues {
  isComparisonModeOn: boolean;
  setIsComparisonModeOn: SetStateType<boolean>;
  comparisonMode: ComparisonModeOptions;
  setComparisonMode: SetStateType<ComparisonModeOptions>;
  period: [Date, Date];
  setPeriod: SetStateType<[Date, Date]>;
  lookback: number;
  setLookback: SetStateType<number>;
  frequency: number;
  frequencyLabel: string;
  setFrequency: SetStateType<number>;
  filters: ColumnsFilters;
  filtersLength: number;
  setFilters: SetStateType<ColumnsFilters>;
  setInitialFilters: SetStateType<ColumnsFilters>;
  activeFilters: DataFilter[];
  reset: boolean;
  resetAll: () => void;
}

interface AnalysisProviderProps {
  children: ReactNode;
}

function calculateActiveFilters(filters: ColumnsFilters) {
  const activeFilters: DataFilter[] = [];

  Object.entries(filters).forEach(([column, value]) => {
    if (value) {
      if (typeof value[0] === 'number' && typeof value[1] === 'number') {
        activeFilters.push({
          column,
          operator: OperatorsMap.greater_than_equals,
          value: value[0]
        });
        activeFilters.push({
          column,
          operator: OperatorsMap.less_than_equals,
          value: value[1]
        });
        return;
      }

      if (typeof value === 'object') {
        Object.entries(value).forEach(([category, active]) => {
          if (active) {
            activeFilters.push({
              column,
              operator: OperatorsMap.contains,
              value: category
            });
          }
        });
      }
    }
  });

  return activeFilters;
}

function calculateFiltersLength(filters: ColumnsFilters) {
  let length = 0;

  Object.values(filters).forEach(value => {
    if (value && Array.isArray(value)) {
      return value && length++;
    } else if (value) {
      Object.values(value).forEach(v => v && length++);
    }
  });

  return length;
}

export const lookBackData = [
  { label: 'Last 7 Days', value: timeMap.week },
  { label: 'Last 30 Days', value: timeMap.month }
];

export const frequencyData = [
  { label: 'Hourly', value: timeValues.hour },
  { label: 'Daily', value: timeValues.day },
  { label: 'Weekly', value: timeValues.week },
  { label: 'Monthly', value: timeValues.mouth }
];

const INITIAL_FREQUENCY_LABEL = frequencyData[1].label;
const INITIAL_DATE: [Date, Date] = [new Date(Date.now() - timeMap.month), new Date()];
const INITIAL_LOOKBACK = lookBackData[1].value;

export const AnalysisContext = createContext<AnalysisContextValues>({
  isComparisonModeOn: true,
  setIsComparisonModeOn: () => 1,
  comparisonMode: ComparisonModeOptions.previousPeriod,
  setComparisonMode: () => 1,
  period: INITIAL_DATE,
  setPeriod: () => 1,
  lookback: INITIAL_LOOKBACK,
  setLookback: () => 1,
  frequency: timeValues.day,
  frequencyLabel: INITIAL_FREQUENCY_LABEL,
  setFrequency: () => 1,
  filters: {},
  filtersLength: 0,
  setFilters: () => 1,
  setInitialFilters: () => 1,
  activeFilters: [],
  reset: false,
  resetAll: () => 1
});

export const AnalysisProvider = ({ children }: AnalysisProviderProps) => {
  const [isComparisonModeOn, setIsComparisonModeOn] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(ComparisonModeOptions.previousPeriod);

  const [lookback, setLookback] = useState(INITIAL_LOOKBACK);
  const [period, setPeriod] = useState(INITIAL_DATE);

  const [frequency, setFrequency] = useState(timeValues.day);
  const [frequencyLabel, setFrequencyLabel] = useState(INITIAL_FREQUENCY_LABEL);

  const [initialFilters, setInitialFilters] = useState<ColumnsFilters>({});
  const [filters, setFilters] = useState<ColumnsFilters>({});
  const [filtersLength, setFiltersLength] = useState(0);
  const [activeFilters, setActiveFilters] = useState<DataFilter[]>([]);

  const [reset, setReset] = useState(false);

  useEffect(() => {
    const label = frequencyData.find(e => e.value === frequency)?.label || INITIAL_FREQUENCY_LABEL;
    setFrequencyLabel(label);
  }, [frequency]);

  useEffect(() => {
    const length = calculateFiltersLength(filters);
    setFiltersLength(length);

    const active = calculateActiveFilters(filters);
    setActiveFilters(active);
  }, [filters]);

  useEffect(() => {
    if (isComparisonModeOn || frequency !== timeValues.day || filtersLength > 0) {
      setReset(true);
    } else {
      setReset(false);
    }
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
      setIsComparisonModeOn,
      comparisonMode,
      setComparisonMode,
      period,
      setPeriod,
      lookback,
      setLookback,
      frequency,
      frequencyLabel,
      setFrequency,
      filters,
      filtersLength,
      setFilters,
      setInitialFilters,
      activeFilters,
      reset,
      resetAll
    }),
    [
      comparisonMode,
      filters,
      filtersLength,
      frequency,
      frequencyLabel,
      isComparisonModeOn,
      lookback,
      activeFilters,
      period,
      reset,
      resetAll
    ]
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
};
