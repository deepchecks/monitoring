import React, { useEffect, useMemo, useState, useCallback, useContext } from 'react';
import { useLocation } from 'react-router-dom';

import {
  useGetChecksApiV1ModelsModelIdChecksGet,
  CheckSchema,
  MonitorCheckConfSchema,
  MonitorCheckConf
} from 'api/generated';
import useModels from 'hooks/useModels';
import { AnalysisContext } from 'context/analysis-context';

import { Box, Stack } from '@mui/material';

import { Loader } from 'components/Loader';
import { ActiveColumnsFilters } from 'components/ActiveColumnsFilters/ActiveColumnsFilters';
import { AnalysisFilters } from 'components/AnalysisFilters/AnalysisFilters';
import { AnalysisHeader } from 'components/AnalysisHeader/AnalysisHeader';
import { AnalysisItem } from 'components/AnalysisItem';
import { AnalysisGroupBy } from 'components/AnalysisGroupBy';

import { getParams } from 'helpers/utils/getParams';
import { CheckType, CheckTypeOptions } from 'helpers/types/check';

export function AnalysisPage() {
  const location = useLocation();
  const { models, isLoading: isModelsLoading, getCurrentModel } = useModels();
  const { isComparisonModeOn, comparisonMode, period, frequency, activeFilters } = useContext(AnalysisContext);

  const [modelId, setModelId] = useState(+getParams()?.modelId || models[0]?.id || -1);
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const [currentCheck, setCurrentCheck] = useState<CheckSchema | null>(null);
  const [currentDatasetName, setCurrentDatasetName] = useState<string | null>(null);
  const [currentAdditionalKwargs, setCurrentAdditionalKwargs] = useState<MonitorCheckConfSchema | null>(null);
  const [currentModelVersionId, setCurrentModelVersionId] = useState<number | null>(null);
  const [currentTimeLabel, setCurrentTimeLabel] = useState<number | null>(null);
  const [currentType, setCurrentType] = useState<CheckType>(null);

  const {
    data: checks,
    isLoading: isChecksLoading,
    refetch
  } = useGetChecksApiV1ModelsModelIdChecksGet(modelId, undefined, {
    query: {
      enabled: false
    }
  });

  const currentModel = useMemo(() => getCurrentModel(modelId), [getCurrentModel, modelId]);

  useEffect(() => {
    if (models) {
      setModelId(+getParams()?.modelId || models[0]?.id);
    }
  }, [models, location.search]);

  useEffect(() => {
    if (models && modelId && modelId > -1) {
      refetch();
    }
  }, [modelId, models, refetch]);

  const handleDrawerOpen = useCallback(
    (
      datasetName: string,
      versionName: string,
      timeLabel: number,
      additionalKwargs: MonitorCheckConfSchema | undefined,
      checkInfo: MonitorCheckConf | undefined,
      check: CheckSchema
    ) => {
      if (additionalKwargs) {
        const type = checkInfo?.res_conf ? CheckTypeOptions.Class : CheckTypeOptions.Feature;

        setCurrentType(type);
        setCurrentAdditionalKwargs(additionalKwargs);
      }

      setCurrentCheck(check);

      if (versionName) {
        const modelVersionId = currentModel.versions.find(v => v.name === versionName)?.id;

        if (modelVersionId) {
          setCurrentDatasetName(datasetName);
          setCurrentModelVersionId(modelVersionId);
          setCurrentTimeLabel(timeLabel);
        }

        setIsGroupByOpen(true);
      }
    },
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

  const isLoading = isModelsLoading || isChecksLoading;

  return (
    <>
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
            checks?.map(check => (
              <AnalysisItem
                key={check.id}
                check={check}
                lastUpdate={new Date()}
                onPointCLick={handleDrawerOpen}
                isComparisonModeOn={isComparisonModeOn}
                comparisonMode={comparisonMode}
                period={period}
                frequency={frequency}
                activeFilters={activeFilters}
                height={528}
                graphHeight={420}
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
}
