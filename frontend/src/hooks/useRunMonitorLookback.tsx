import { useEffect } from 'react';
import { useRunMonitorLookbackApiV1MonitorsMonitorIdRunPost, ModelManagmentSchema } from 'api/generated';

const useRunMonitorLookback = (monitorId: number | null, currentModel: ModelManagmentSchema | null) => {
  const { mutateAsync } = useRunMonitorLookbackApiV1MonitorsMonitorIdRunPost();

  useEffect(() => {
    if (!currentModel || !monitorId) return;

    const end_time = currentModel.latest_time ? new Date(currentModel.latest_time * 1000).toISOString() : '';
    mutateAsync({ monitorId, data: { end_time } });
  }, [currentModel, monitorId, mutateAsync]);
};

export default useRunMonitorLookback;
