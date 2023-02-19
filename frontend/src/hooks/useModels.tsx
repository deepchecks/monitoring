import { useMemo, useCallback, useContext } from 'react';

import { ModelManagmentSchema } from 'api/generated';
import { GlobalStateContext } from '../context';

export const emptyModel = {
  id: -1,
  name: 'Empty'
} as ModelManagmentSchema;

export interface ModelsManagement {
  models: ModelManagmentSchema[];
  isLoading: boolean;
  refetch: () => void;
}

export const useModels = () => {
  const { modelsManagement } = useContext(GlobalStateContext);

  const { models, isLoading, refetch: refetchModels } = modelsManagement;

  const sortedModels = useMemo(() => [...models].sort((a, b) => a.name.localeCompare(b.name)), [models]);

  const modelsMap = useMemo(() => {
    const map: Record<string, ModelManagmentSchema> = {};
    sortedModels.forEach(model => (map[model.id] = model));
    return map;
  }, [sortedModels]);

  const getCurrentModel = useCallback(
    (modelId: number | undefined) => (modelId && modelsMap?.[modelId] ? modelsMap[modelId] : emptyModel),
    [modelsMap]
  );

  return { modelsMap, models: sortedModels, isLoading, refetchModels, getCurrentModel };
};

export default useModels;
