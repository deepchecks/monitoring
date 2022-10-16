import dayjs from 'dayjs';
import { useMemo } from 'react';
import { useRetrieveModelsDataIngestionApiV1ModelsDataIngestionGet } from '../api/generated';
import { setLineGraphOptions } from '../helpers/setGraphOptions';
import useModels from './useModels';
import useStatsTime from './useStatsTime';

const useDataIngestion = (modelId: number | null = null) => {
  const [statsTime] = useStatsTime();
  const { modelsMap } = useModels();
  const modelOptions = modelId ? { model_id: modelId } : {};

  const latestTime = Math.max(...Object.values(modelsMap).map(o => (o.latest_time ? o.latest_time : 0)));
  const { data = [], isLoading } = useRetrieveModelsDataIngestionApiV1ModelsDataIngestionGet({
    time_filter: statsTime.value,
    end_time: latestTime > 0 ? dayjs.unix(latestTime).toISOString() : undefined,
    ...modelOptions
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
          ...setLineGraphOptions(modelsMap ? modelsMap[key]?.name : key, index)
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
