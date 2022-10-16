import { Box, Stack } from '@mui/material';
import { useGetChecksApiV1ModelsModelIdChecksGet } from 'api/generated';
import { ActiveColumnsFilters } from 'components/ActiveColumnsFilters/ActiveColumnsFilters';
import { AnalysisFilters } from 'components/AnalysisFilters/AnalysisFilters';
import { AnalysisHeader } from 'components/AnalysisHeader';
import { AnalysisItem } from 'components/AnalysisItem';
import { Loader } from 'components/Loader';
import { AnalysisProvider } from 'Context/AnalysisContext';
import { getParams } from 'helpers/utils/getParams';
import useModels from 'hooks/useModels';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

const emptyModel = {
  id: -1,
  name: 'Empty'
};

export function AnalysisPage() {
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
  const location = useLocation();

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
  }, [modelId]);

  const isLoading = isModelsLoading || isChecksLoading;

  return (
    <AnalysisProvider>
      <Box>
        <Stack spacing={'42px'}>
          <AnalysisHeader changeModel={setModelId} models={models} model={currentModel} />
          {/* eslint-disable @typescript-eslint/ban-ts-comment */}
          {/* @ts-ignore */}
          <AnalysisFilters model={currentModel} />
        </Stack>
        <ActiveColumnsFilters />
        <Stack spacing="30px" mt="30px">
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
