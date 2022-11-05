import { ModelManagmentSchema, useRetrieveAvailableModelsApiV1AvailableModelsGet } from 'api/generated';
import { useMemo } from 'react';

export const useModels = () => {
  const { data: models = [], isLoading, refetch: refetchModels } = useRetrieveAvailableModelsApiV1AvailableModelsGet({ query: {
      refetchOnWindowFocus: false
    }});
  
  models.sort((a, b) => a.name.localeCompare(b.name))
  const modelsMap = useMemo(
    () =>
      models.reduce((acc, model) => {
        // eslint-disable-next-line no-param-reassign
        acc[model.id] = model;
        return acc;
      }, {} as Record<string, ModelManagmentSchema>),
    [models]
  );

  return { modelsMap, models, isLoading, refetchModels };
};

export default useModels;
