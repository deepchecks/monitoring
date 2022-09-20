import { useRunMonitorLookbackApiV1MonitorsMonitorIdRunPost } from 'api/generated';
import { useEffect } from 'react';
import useModels from './useModels';

const useRunMonitorLookback = (monitorId: number | null, modelId: string | null) => {
  const { modelsMap } = useModels();
  const runMonitor = useRunMonitorLookbackApiV1MonitorsMonitorIdRunPost();

  useEffect(() => {
    if (!modelId || !monitorId) return;

    const monitorModel = modelsMap[modelId];

    if (!monitorModel) return;

    const end_time = monitorModel.latest_time ? new Date(monitorModel.latest_time).toISOString() : '';
    runMonitor.mutateAsync({ monitorId, data: { end_time } });
  }, [modelsMap, monitorId]);
};

export default useRunMonitorLookback;
