import { useRunMonitorLookbackApiV1MonitorsMonitorIdRunPost } from 'api/generated';
import { useEffect } from 'react';
import useModelsMap from './useModelsMap';

const useRunMonitorLookback = (monitorId: number | null, modelId: string | null) => {
  const modelsMap = useModelsMap();
  const runMonitor = useRunMonitorLookbackApiV1MonitorsMonitorIdRunPost();

  useEffect(() => {
    if (!modelId || !monitorId) return;

    const monitorModel = modelsMap[modelId];

    if (!monitorModel) return;

    const end_time = monitorModel.latest_time?.toString() ?? void 0;
    runMonitor.mutateAsync({ monitorId, data: { end_time } });
  }, [modelsMap, monitorId]);
};

export default useRunMonitorLookback;
