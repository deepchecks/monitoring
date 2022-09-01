import { ModelsInfoSchema, useGetModelsApiV1ModelsGet } from 'api/generated';
import { useMemo } from 'react';

const useModelsMap = () => {
  const { data: models = [] } = useGetModelsApiV1ModelsGet();

  const modelsMap = useMemo(
    () =>
      models.reduce((acc, model) => {
        // eslint-disable-next-line no-param-reassign
        acc[model.id] = model;
        return acc;
      }, {} as Record<string, ModelsInfoSchema>),
    [models]
  );

  return modelsMap;
};

export default useModelsMap;
