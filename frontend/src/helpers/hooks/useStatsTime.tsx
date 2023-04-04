import React, { createContext, useContext, useState } from 'react';

export type StatTimeId = string;

export type StatTime = {
  id: StatTimeId;
  label: string;
  value: number;
};

export type StatsTimeProvider = {
  children: JSX.Element;
};

export type StatsTimeContext = [StatTime, (newId: StatTimeId) => void, StatTime[]];

export const labelPrefix = 'Last';

const statTimes: StatTime[] = [
  { label: `${labelPrefix} hour`, value: 60 * 60 },
  { label: `${labelPrefix} day`, value: 60 * 60 * 24 },
  { label: `${labelPrefix} week`, value: 60 * 60 * 24 * 7 },
  { label: `${labelPrefix} month`, value: 60 * 60 * 24 * 31 },
  { label: `${labelPrefix} 3 months`, value: 60 * 60 * 24 * 31 * 3 }
].map((item, i) => ({ ...item, id: i.toString() }));

const DEFAULT_STAT_TIME = statTimes[2];

const StatTimeContext = createContext<StatsTimeContext | null>(null);

const useStatsTime = () => {
  const context = useContext(StatTimeContext);
  if (context === null) throw Error('StatsTimeContext is null');

  return context;
};

export const StatsTimeProvider = ({ children }: StatsTimeProvider): JSX.Element => {
  const [current, setCurrent] = useState<StatTime>(DEFAULT_STAT_TIME);

  const setCurrentById = (newId: StatTime['id']) => {
    const newStatTime = statTimes.find(({ id }) => id === newId);
    if (!newStatTime) throw Error(`Couldn't find statTime ID: ${newId}`);

    setCurrent(newStatTime);
  };

  const value = [current, setCurrentById, statTimes] as StatsTimeContext;

  return <StatTimeContext.Provider value={value}>{children}</StatTimeContext.Provider>;
};

export default useStatsTime;
