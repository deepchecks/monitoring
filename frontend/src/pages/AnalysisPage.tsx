import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { AnalysisProvider } from 'context/analysis-context';
import { ModelManagmentSchema, useGetChecksApiV1ModelsModelIdChecksGet } from 'api/generated';
import useModels from 'hooks/useModels';

import { getParams } from 'helpers/utils/getParams';

import { Box, Stack } from '@mui/material';

import { Loader } from 'components/Loader';
import { ActiveColumnsFilters } from 'components/ActiveColumnsFilters/ActiveColumnsFilters';
import { AnalysisFilters } from 'components/AnalysisFilters/AnalysisFilters';
import { AnalysisHeader } from 'components/AnalisysHeader/AnalysisHeader';
import { AnalysisItem } from 'components/AnalysisItem/AnalysisItem';

const emptyModel = {
  id: -1,
  name: 'Empty'
} as ModelManagmentSchema;

export function AnalysisPage() {
  const location = useLocation();
  const { models, isLoading: isModelsLoading } = useModels();

  const [modelId, setModelId] = useState(+getParams()?.modelId || models[0]?.id || -1);

  const {
    data: checks,
    isLoading: isChecksLoading,
    refetch
  } = useGetChecksApiV1ModelsModelIdChecksGet(modelId, {
    query: {
      enabled: false
    }
  });

  useEffect(() => {
    if (models) {
      setModelId(+getParams()?.modelId || models[0]?.id);
    }
  }, [models, location.search]);

  const currentModel = useMemo(
    () =>
      models.reduce((acc, model) => {
        if (model.id === modelId) {
          return model;
        }

        return acc;
      }, emptyModel),
    [models, modelId]
  );

  useEffect(() => {
    if (models && modelId && modelId > -1) {
      refetch();
    }
  }, [modelId, models, refetch]);

  const isLoading = isModelsLoading || isChecksLoading;

  return (
    <AnalysisProvider>
      <Box>
        <Stack spacing="42px" mb="35px">
          <AnalysisHeader changeModel={setModelId} models={models} model={currentModel} />
          <AnalysisFilters model={currentModel} />
        </Stack>
        <ActiveColumnsFilters />
        <Stack spacing="30px" mb="30px">
          {isLoading ? (
            <Loader />
          ) : (
            checks?.map(check => <AnalysisItem key={check.id} check={check} lastUpdate={new Date()} />)
          )}
        </Stack>
      </Box>
    </AnalysisProvider>
  );
}
