import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { useRetrieveModelsDataIngestionApiV1ModelsDataIngestionGet } from '../api/generated';
import useStatsTime from './useStatsTime';
import { setGraphColor } from '../helpers/graphColors';
import useModelsMap from './useModelsMap';

const useDataIngestion = () => {
  const [statsTime] = useStatsTime();
  const modelsMap = useModelsMap();

  const latestTime = Math.max(...Object.values(modelsMap).map(o => (o.latest_time ? o.latest_time : 0)));
  const { data = [], isLoading } = useRetrieveModelsDataIngestionApiV1ModelsDataIngestionGet({
    time_filter: statsTime.value,
    end_time: latestTime > 0 ? dayjs.unix(latestTime).toISOString() : undefined
  });

  const graphData = useMemo(
    () => ({
      datasets:
        Object.entries(data).map(([key, item], index) => ({
          data: item
            .sort((a, b) => a.day - b.day)
            .map(({ count, day }) => ({
              x: dayjs(new Date(day * 1_000)).format('MMM. DD YYYY'),
              y: count
            })),
          ...setGraphColor(modelsMap ? modelsMap[key].name : key, index)
        })) ?? [],
      labels: Object.entries(data)
        .flatMap(([_, items]) => items.map(item => item.day * 1_000))
        .sort()
        .map(day => dayjs(day).format('MMM. DD YYYY'))
    }),
    [data, modelsMap]
  );

  return {
    data,
    graphData,
    isLoading
  };
};

export default useDataIngestion;
