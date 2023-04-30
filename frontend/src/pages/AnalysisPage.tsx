import React, { useEffect, useMemo, useState, useCallback, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Stack } from '@mui/material';

import {
  useGetChecksApiV1ModelsModelIdChecksGet,
  CheckSchema,
  MonitorCheckConfSchema,
  MonitorCheckConf
} from 'api/generated';
import useModels from 'helpers/hooks/useModels';
import { AnalysisContext } from 'helpers/context/AnalysisProvider';

import { Loader } from 'components/Loader';
import { AnalysisFilters } from 'components/AnalysisFilters/AnalysisFilters';
import { AnalysisHeader } from 'components/AnalysisHeader/AnalysisHeader';
import { AnalysisGroupBy } from 'components/AnalysisGroupBy';
import AnalysisItem from 'components/AnalysisItem/AnalysisItem';

import { getParams } from 'helpers/utils/getParams';
import { CheckType } from 'helpers/types/check';
import { onDrawerOpen } from 'helpers/onDrawerOpen';

const AnalysisPage = () => {
  const location = useLocation();
  const { models, getCurrentModel } = useModels();
  const { period, frequency, compareWithPreviousPeriod, compareByReference, activeFilters, resetAllFilters } =
    useContext(AnalysisContext);

  const [modelId, setModelId] = useState(+getParams()?.modelId || models[0]?.id || -1);
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const [currentCheck, setCurrentCheck] = useState<CheckSchema | null>(null);
  const [currentDatasetName, setCurrentDatasetName] = useState<string | null>(null);
  const [currentAdditionalKwargs, setCurrentAdditionalKwargs] = useState<MonitorCheckConfSchema | null>(null);
  const [currentModelVersionId, setCurrentModelVersionId] = useState<number | null>(null);
  const [currentTimeLabel, setCurrentTimeLabel] = useState<number | null>(null);
  const [currentType, setCurrentType] = useState<CheckType>(null);

  const isLoading = !frequency || !period;
  const currentModel = useMemo(() => getCurrentModel(modelId), [getCurrentModel, modelId]);
  const { data: checks, refetch } = useGetChecksApiV1ModelsModelIdChecksGet(modelId, undefined, {
    query: {
      enabled: false
    }
  });

  const handleDrawerOpen = useCallback(
    (
      datasetName: string,
      versionName: string,
      timeLabel: number,
      additionalKwargs: MonitorCheckConfSchema | undefined,
      checkInfo: MonitorCheckConf | undefined,
      check: CheckSchema
    ) =>
      onDrawerOpen(
        datasetName,
        versionName,
        timeLabel,
        additionalKwargs,
        checkInfo,
        check,
        setIsGroupByOpen,
        setCurrentType,
        setCurrentAdditionalKwargs,
        setCurrentDatasetName,
        setCurrentModelVersionId,
        setCurrentTimeLabel,
        setCurrentCheck,
        currentModel
      ),
    [currentModel.versions]
  );

  const handleDrawerClose = useCallback(() => {
    setIsGroupByOpen(false);
    setCurrentCheck(null);
    setCurrentDatasetName(null);
    setCurrentAdditionalKwargs(null);
    setCurrentModelVersionId(null);
    setCurrentTimeLabel(null);
    setCurrentType(null);
  }, []);

  useEffect(() => {
    if (models) {
      setModelId(+getParams()?.modelId || models[0]?.id);
    }
  }, [models, location.search]);

  useEffect(() => {
    if (modelId) {
      refetch();
    }
  }, [modelId, refetch]);

  return (
    <>
      <Box>
        <Stack sx={{ marginBottom: '20px' }}>
          <AnalysisHeader
            changeModel={setModelId}
            models={models}
            model={currentModel}
            resetAllFilters={resetAllFilters}
          />
          <AnalysisFilters model={currentModel} />
        </Stack>
        <Stack spacing="30px" mb="30px">
          {isLoading ? (
            <Loader />
          ) : (
            checks?.map(check => (
              <AnalysisItem
                key={check.id}
                check={check}
                lastUpdate={new Date()}
                onPointCLick={handleDrawerOpen}
                compareWithPreviousPeriod={compareWithPreviousPeriod}
                compareByReference={compareByReference}
                period={period}
                frequency={frequency}
                activeFilters={activeFilters}
                height={528}
                graphHeight={359}
              />
            ))
          )}
        </Stack>
      </Box>
      <AnalysisGroupBy
        modelName={currentModel.name}
        datasetName={currentDatasetName}
        check={currentCheck}
        modelVersionId={currentModelVersionId}
        open={isGroupByOpen}
        onClose={handleDrawerClose}
        onCloseIconClick={handleDrawerClose}
        timeLabel={currentTimeLabel}
        additionalKwargs={currentAdditionalKwargs}
        type={currentType}
      />
    </>
  );
};

export default AnalysisPage;
