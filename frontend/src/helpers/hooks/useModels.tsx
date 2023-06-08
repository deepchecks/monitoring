import { useMemo, useCallback } from 'react';
import { ModelManagmentSchema, useRetrieveAvailableModelsApiV1AvailableModelsGet } from 'api/generated';

export const emptyModel = {
  id: -1,
  name: 'Empty'
} as ModelManagmentSchema;

export const useModels = (showAll?: 'showAll') => {
  const {
    data: models = [],
    isLoading,
    refetch: refetchModels
  } = useRetrieveAvailableModelsApiV1AvailableModelsGet({ show_all: !!showAll });

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
