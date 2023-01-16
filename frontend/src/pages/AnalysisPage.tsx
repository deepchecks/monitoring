import React, { useEffect, useMemo, useState, useCallback, useContext, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import {
  useGetChecksApiV1ModelsModelIdChecksGet,
  CheckSchema,
  MonitorCheckConfSchema,
  MonitorCheckConf,
  useRunManyChecksTogetherApiV1ChecksRunManyPost,
  RunManyChecksTogetherApiV1ChecksRunManyPost200
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
  const [checksInitialData, setChecksInitialData] = useState<RunManyChecksTogetherApiV1ChecksRunManyPost200 | undefined>(undefined);
  const checksWithCustomProps = useRef(new Set<number>());

  const {
    data: checks,
    isLoading: isChecksLoading,
    refetch
  } = useGetChecksApiV1ModelsModelIdChecksGet(modelId, undefined, {
    query: {
      enabled: false
    }
  });


  const {
    mutateAsync: mutateLoadCheckData
  } = useRunManyChecksTogetherApiV1ChecksRunManyPost();

  const currentModel = useMemo(() => getCurrentModel(modelId), [getCurrentModel, modelId]);

  useEffect(() => {
    if (models) {
      setModelId(+getParams()?.modelId || models[0]?.id);
    }
  }, [models, location.search]);

  // If modelId has changed refetch the checks
  useEffect(() => {
    if (modelId) {
      setChecksInitialData(undefined)
      refetch()
    }
  }, [modelId, refetch])

  useEffect(() => {
    if (checks && frequency && period) {
      // We load in a single request all the checks that doesn't have a custom properties defined on them.
      const fetchData = async () => {
        const checksToLoad = checks?.filter(check => !checksWithCustomProps.current.has(check.id)).map(check => check.id)
        if (checksToLoad.length > 1) {
          // Removing current initial data in order to show loader
          setChecksInitialData(undefined)
          const response = await mutateLoadCheckData({
            data: {
              frequency,
              start_time: period[0].toISOString(),
              end_time: period[1].toISOString()
            },
            params: {check_id: checksToLoad}
          })
          setChecksInitialData(response)
        }
        else {
          // If checks initial data is empty each check will load his own data
          setChecksInitialData(undefined)
        }
      }

      fetchData()
    }
  }, [frequency, period, checks, mutateLoadCheckData]);

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

        if (additionalKwargs.check_conf['aggregation method'][0] == 'none') {
          if (type === CheckTypeOptions.Feature) {
            setCurrentAdditionalKwargs(
              // Filter only the feature that was clicked on
              {check_conf: {...additionalKwargs.check_conf, feature: [datasetName]},
              res_conf: additionalKwargs.res_conf}
            )
          } else {
            setCurrentAdditionalKwargs(
              {check_conf: additionalKwargs.check_conf,
              // Filter only the class that was clicked on
              res_conf: [datasetName.replace(additionalKwargs.check_conf.scorer[0], '').trim()]}
            )
          }
        }
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

  const isLoading = isModelsLoading || isChecksLoading || checksInitialData == undefined || frequency == undefined || period == undefined;

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
                initialData={checksInitialData[check.id]}
                checksWithCustomProps={checksWithCustomProps}
                lastUpdate={new Date()}
                onPointCLick={handleDrawerOpen}
                isComparisonModeOn={isComparisonModeOn}
                comparisonMode={comparisonMode}
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
}

export default AnalysisPage;