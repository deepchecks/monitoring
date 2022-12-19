import { useMemo, useCallback } from 'react';

import { ModelManagmentSchema, useRetrieveAvailableModelsApiV1AvailableModelsGet } from 'api/generated';

const emptyModel = {
  id: -1,
  name: 'Empty'
} as ModelManagmentSchema;

export const useModels = () => {
  const {
    data: models = [],
    isLoading,
    refetch: refetchModels
  } = useRetrieveAvailableModelsApiV1AvailableModelsGet({
    query: {
      refetchOnWindowFocus: false
    }
  });

  models.sort((a, b) => a.name.localeCompare(b.name));

  const modelsMap = useMemo(() => {
    const map: Record<string, ModelManagmentSchema> = {};
    models.forEach(model => (map[model.id] = model));
    return map;
  }, [models]);

  const getCurrentModel = useCallback((modelId: number) => modelsMap[modelId] || emptyModel, [modelsMap]);

  return { modelsMap, models, isLoading, refetchModels, getCurrentModel };
};

export default useModels;
