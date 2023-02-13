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
import useModels, { emptyModel } from 'hooks/useModels';
import { AnalysisContext } from 'context/analysis-context';

import { Box, Stack } from '@mui/material';

import { Loader } from 'components/Loader';
import { ActiveColumnsFilters } from 'components/ActiveColumnsFilters/ActiveColumnsFilters';
import { AnalysisFilters } from 'components/AnalysisFilters/AnalysisFilters';
import { AnalysisHeader } from 'components/AnalysisHeader/AnalysisHeader';
import { AnalysisItem } from 'components/AnalysisItem';
import { AnalysisGroupBy } from 'components/AnalysisGroupBy';

import { getParams, setParams } from 'helpers/utils/getParams';
import { CheckType, CheckTypeOptions } from 'helpers/types/check';
import { ReverseTypeMap } from 'components/AnalysisItem/AnalysisItem.types';

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
  const [checksInitialData, setChecksInitialData] = useState<
    RunManyChecksTogetherApiV1ChecksRunManyPost200 | undefined
  >(undefined);
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

  const { mutateAsync: mutateLoadCheckData } = useRunManyChecksTogetherApiV1ChecksRunManyPost();

  const currentModel = useMemo(() => getCurrentModel(modelId), [getCurrentModel, modelId]);

  useEffect(() => {
    if (currentModel === emptyModel && +getParams()?.modelId > 0) {
      setParams('modelId');
    }
  }, [location.search])

  useEffect(() => {
    if (models) {
      setModelId(+getParams()?.modelId || models[0]?.id);
    }
  }, [models, location.search]);

  useEffect(() => {
    if (models) {
      setModelId(+getParams()?.modelId || models[0]?.id);
    }
  }, [models, location.search]);

  // If modelId has changed refetch the checks
  useEffect(() => {
    if (modelId) {
      setChecksInitialData(undefined);
      refetch();
    }
  }, [modelId, refetch]);

  useEffect(() => {
    if (checks && frequency && period) {
      // We load in a single request all the checks that doesn't have a custom properties defined on them.
      const fetchData = async () => {
        const checksToLoad = checks
          ?.filter(check => !checksWithCustomProps.current.has(check.id))
          .map(check => check.id);
        if (checksToLoad.length > 1) {
          // Removing current initial data in order to show loader
          setChecksInitialData(undefined);
          const response = await mutateLoadCheckData({
            data: {
              frequency,
              start_time: period[0].toISOString(),
              end_time: period[1].toISOString()
            },
            params: { check_id: checksToLoad }
          });
          setChecksInitialData(response);
        } else {
          // If checks initial data is empty each check will load his own data
          setChecksInitialData({});
        }
      };

      fetchData();
    }
  }, [frequency, period, checks, mutateLoadCheckData]);

  function renameKeys(obj: any, newKeys: any) {
    const keyValues = Object.keys(obj).map(key => {
      const newKey = newKeys?.[key] || key;
      return { [newKey]: obj[key] };
    });
    return Object.assign({}, ...keyValues);
  }

  function fixDict(obj: any, allowedKeys: any) {
    const keyValues = Object.keys(obj).map(key => {
      if (Object.values(allowedKeys).includes(key))
        return { [key]: typeof obj[key] == 'string' ? [obj[key]] : obj[key] };
      return {};
    });
    return Object.assign({}, ...keyValues);
  }

  const handleDrawerOpen = useCallback(
    (
      datasetName: string,
      versionName: string,
      timeLabel: number,
      additionalKwargs: MonitorCheckConfSchema | undefined,
      checkInfo: MonitorCheckConf | undefined,
      check: CheckSchema
    ) => {
      const checkMegaConf = fixDict(
        { ...renameKeys({ ...check.config.params }, ReverseTypeMap), ...additionalKwargs?.check_conf },
        ReverseTypeMap
      );
      if (checkMegaConf) {
        // if the info doesn't contains a selection of features there is no specific check type
        const type = checkInfo?.res_conf ? CheckTypeOptions.Class : (
          checkInfo?.check_conf?.filter(val => val.type == 'feature').length ? CheckTypeOptions.Feature : null
        );
        setCurrentType(type);

        if (type === CheckTypeOptions.Feature && !checkMegaConf['aggregation method'] ||
          ['none', null].includes(checkMegaConf['aggregation method']?.[0])
        ) {
          setCurrentAdditionalKwargs(
            // Filter only the feature that was clicked on
            {
              check_conf: { ...checkMegaConf, feature: [datasetName] },
              res_conf: additionalKwargs?.res_conf
            }
          );
        } else if (type === CheckTypeOptions.Class && additionalKwargs?.check_conf?.scorer != undefined) {
          let class_name = undefined;
          for (let i = 0; i < checkMegaConf?.scorer?.length || 0; i++) {
            if (datasetName.startsWith(checkMegaConf.scorer[i])) {
              class_name = datasetName.replace(checkMegaConf.scorer[i], '').trim();
              if (class_name != datasetName) break;
            }
          }

          setCurrentAdditionalKwargs({
            check_conf: checkMegaConf,
            // Filter only the class that was clicked on
            res_conf: class_name ? [class_name] : undefined
          });
        } else {
          setCurrentAdditionalKwargs({ check_conf: checkMegaConf });
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

  const isLoading =
    isModelsLoading ||
    isChecksLoading ||
    checksInitialData == undefined ||
    frequency == undefined ||
    period == undefined;

  return (
    <>
      <Box>
        <Stack spacing="32px" mb="15px">
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
