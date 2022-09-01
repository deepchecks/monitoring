import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { useRetrieveModelsDataIngestionApiV1ModelsDataIngestionGet } from '../api/generated';
import useStatsTime from './useStatsTime';
import { setGraphColor } from '../helpers/graphColors';

const useDataIngestion = () => {
  const [statsTime] = useStatsTime();

  const { data = [], isLoading } = useRetrieveModelsDataIngestionApiV1ModelsDataIngestionGet({
    time_filter: statsTime.value
  });

  const graphData = useMemo(
    () => ({
      datasets:
        Object.entries(data).map(([key, item], index) => ({
          data: item
            .sort((a, b) => a.day - b.day)
            .map(({ count, day }) => ({
              x: dayjs(new Date(day * 1_000)).format('MMM. DD (HH:mm:ss)'),
              y: count
            })),
          ...setGraphColor(key, index)
        })) ?? [],
      labels: Object.entries(data)
        .flatMap(([_, items]) => items.map(item => item.day * 1_000))
        .sort()
        .map(day => dayjs(day).format('MMM. DD (HH:mm:ss)'))
    }),
    [data]
  );

  return {
    data,
    graphData,
    isLoading
  };
};

export default useDataIngestion;
