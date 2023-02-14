import dayjs from 'dayjs';
import { useMemo } from 'react';
import {
  useRetrieveAllModelsDataIngestionApiV1ModelsDataIngestionGet,
  useRetrieveModelsDataIngestionApiV1ModelsModelIdDataIngestionGet
} from '../api/generated';
import { setLineGraphOptions } from '../helpers/setGraphOptions';
import useModels from './useModels';
import useStatsTime from './useStatsTime';

const useDataIngestion = (modelId: number | null = null) => {
  const [statsTime] = useStatsTime();
  const { modelsMap } = useModels();

  const latestTime = modelId
    ? modelsMap?.[modelId]?.latest_time ?? 0
    : Math.max(...Object.values(modelsMap).map(o => (o.latest_time ? o.latest_time : 0)));
  const { data: singleModelData = [], isLoading: singleLoading } =
    useRetrieveModelsDataIngestionApiV1ModelsModelIdDataIngestionGet(
      modelId as number,
      {
        end_time: latestTime > 0 ? dayjs.unix(latestTime).toISOString() : undefined,
        time_filter: statsTime.value
      },
      {
        query: {
          enabled: modelId != undefined
        }
      }
    );
  const { data: allModelsData = [], isLoading: allLoading } =
    useRetrieveAllModelsDataIngestionApiV1ModelsDataIngestionGet(
      {
        time_filter: statsTime.value,
        end_time: latestTime > 0 ? dayjs.unix(latestTime).toISOString() : undefined
      },
      {
        query: {
          enabled: modelId == undefined
        }
      }
    );

  const data = modelId ? singleModelData : allModelsData;
  const isLoading = modelId ? singleLoading : allLoading;

  const graphData = useMemo(
    () => ({
      datasets:
        Object.entries(data).map(([key, item], index) => ({
          data: item
            .sort((a, b) => a.timestamp - b.timestamp)
            .map(({ timestamp, count }) => ({ x: dayjs(timestamp * 1000).valueOf(), y: count })),
          ...setLineGraphOptions(modelsMap ? modelsMap[key]?.name : key, index)
        })) ?? [],
      labels: Object.entries(data)
        .flatMap(([, items]) => items.map(item => item.timestamp * 1_000))
        .sort()
        .map(day => dayjs(day).valueOf())
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
