import { ModelsInfoSchema, useGetModelsApiV1ModelsGet } from 'api/generated';
import { useMemo } from 'react';

export const useModels = () => {
  const { data: models = [], isLoading } = useGetModelsApiV1ModelsGet();

  const modelsMap = useMemo(
    () =>
      models.reduce((acc, model) => {
        // eslint-disable-next-line no-param-reassign
        acc[model.id] = model;
        return acc;
      }, {} as Record<string, ModelsInfoSchema>),
    [models]
  );

  return { modelsMap, models, isLoading };
};

export default useModels;
