import React, { createContext, ReactNode, useCallback, useMemo, useState, useEffect } from 'react';

import { DataFilter, AutoFrequencyResponse, OperatorsEnum } from 'api/generated';

import { timeMap, timeValues } from 'helpers/time';
import { SetStateType } from 'helpers/types';
import { setStorageItem, storageKeys } from 'helpers/utils/localStorage';

export type FilterValue = Record<string, boolean> | [number, number] | null;

export type ColumnsFilters = Record<string, FilterValue>;

export interface AnalysisContextValues {
  compareWithPreviousPeriod: boolean;
  setCompareWithPreviousPeriod: SetStateType<boolean>;
  period: [Date, Date] | null;
  setPeriod: SetStateType<[Date, Date] | null>;
  frequency: number | null;
  frequencyLabel: string | null;
  setFrequency: SetStateType<number | null>;
  filters: ColumnsFilters;
  filtersLength: number;
  setFilters: SetStateType<ColumnsFilters>;
  setInitialFilters: SetStateType<ColumnsFilters>;
  activeFilters: DataFilter[];
  reset: boolean;
  resetAll: () => void;
  defaultFrequency: AutoFrequencyResponse | null;
  setDefaultFrequency: SetStateType<AutoFrequencyResponse | null>;
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
          operator: OperatorsEnum.greater_than_equals,
          value: value[0]
        });
        activeFilters.push({
          column,
          operator: OperatorsEnum.less_than_equals,
          value: value[1]
        });
        return;
      }

      if (typeof value === 'object') {
        const cateogires = Object.entries(value)
          .filter(([, is_marked]) => is_marked)
          .map(entry => entry[0]);
        if (cateogires.length > 0) {
          activeFilters.push({
            column,
            operator: OperatorsEnum.in,
            value: cateogires
          });
        }
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
  { label: 'Monthly', value: timeValues.month }
];

export const AnalysisContext = createContext<AnalysisContextValues>({
  compareWithPreviousPeriod: false,
  setCompareWithPreviousPeriod: () => 1,
  period: null,
  setPeriod: () => 1,
  frequency: timeValues.day,
  frequencyLabel: null,
  setFrequency: () => 1,
  filters: {},
  filtersLength: 0,
  setFilters: () => 1,
  setInitialFilters: () => 1,
  activeFilters: [],
  reset: false,
  resetAll: () => 1,
  defaultFrequency: null,
  setDefaultFrequency: () => 1
});

export const AnalysisProvider = ({ children }: AnalysisProviderProps) => {
  const [compareWithPreviousPeriod, setCompareWithPreviousPeriod] = useState(false);

  const [period, setPeriod] = useState<[Date, Date] | null>(null);

  const [frequency, setFrequency] = useState<number | null>(null);
  const [frequencyLabel, setFrequencyLabel] = useState<string | null>(null);

  const [initialFilters, setInitialFilters] = useState<ColumnsFilters>({});
  const [filters, setFilters] = useState<ColumnsFilters>({});
  const [filtersLength, setFiltersLength] = useState(0);
  const [activeFilters, setActiveFilters] = useState<DataFilter[]>([]);

  const [reset, setReset] = useState(false);

  const [defaultFrequency, setDefaultFrequency] = useState<AutoFrequencyResponse | null>(null);

  useEffect(() => {
    const label = frequencyData.find(e => e.value === frequency)?.label || null;

    setFrequencyLabel(label);
    setStorageItem(storageKeys.analysisFrequency, JSON.stringify(frequency));
  }, [frequency]);

  useEffect(() => {
    setStorageItem(storageKeys.analysisPeriod, JSON.stringify(period));
  }, [period]);

  useEffect(() => {
    const length = calculateFiltersLength(filters);
    setFiltersLength(length);

    const active = calculateActiveFilters(filters);
    setActiveFilters(active);
  }, [filters]);

  useEffect(() => {
    filtersLength > 0 ? setReset(true) : setReset(false);
  }, [filtersLength]);

  const resetAll = useCallback(() => {
    setFiltersLength(0);
    setFilters(initialFilters);
    setReset(false);
  }, [initialFilters, defaultFrequency]);

  const value = useMemo(
    () => ({
      compareWithPreviousPeriod,
      setCompareWithPreviousPeriod,
      period,
      setPeriod,
      frequency,
      frequencyLabel,
      setFrequency,
      filters,
      filtersLength,
      setFilters,
      setInitialFilters,
      activeFilters,
      reset,
      resetAll,
      defaultFrequency,
      setDefaultFrequency
    }),
    [
      filters,
      filtersLength,
      frequency,
      frequencyLabel,
      compareWithPreviousPeriod,
      activeFilters,
      period,
      reset,
      resetAll,
      defaultFrequency,
      setDefaultFrequency
    ]
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
};
