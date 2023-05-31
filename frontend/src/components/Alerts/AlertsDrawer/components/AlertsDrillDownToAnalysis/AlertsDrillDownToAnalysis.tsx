import React, { memo, useState, useEffect, useMemo } from 'react';

import {
  DataFilter,
  useGetChecksApiV1ModelsModelIdChecksGet,
  SingleCheckRunOptions,
  runCheckGroupByFeatureApiV1ChecksCheckIdGroupByModelVersionIdFeaturePost,
  CheckGroupBySchema,
  MonitorSchema
} from 'api/generated';
import { useModels } from 'helpers/hooks/useModels';

import { Box, Stack, styled } from '@mui/material';

import { AlertsDrillDownToAnalysisHeader } from './AlertsDrillDownToAnalysisHeader';
import { TabPanel } from 'components/TabPanel';
import { Loader } from 'components/base/Loader/Loader';
import AnalysisItem from 'components/Analysis/AnalysisItem/AnalysisItem';
import { SegmentsDrillDown } from 'components/SegmentsDrillDown';

import { ControlledMarkedSelectSelectValues } from 'components/base/MarkedSelect/ControlledMarkedSelect';
import { getAvailableFeaturesNames } from 'helpers/utils/featuresUtils';
import { FrequencyMap } from 'helpers/utils/frequency';

import { theme } from 'components/lib/theme';

interface AlertsDrillDownToAnalysisProps {
  modelId: number;
  period: [Date, Date];
  monitor: MonitorSchema;
  modelVersionId: number | undefined;
  singleCheckRunOptions: SingleCheckRunOptions;
}

const NOW = new Date();

const AlertsDrillDownToAnalysisComponent = ({
  modelId,
  period,
  monitor,
  modelVersionId,
  singleCheckRunOptions
}: AlertsDrillDownToAnalysisProps) => {
  const { isLoading: isModelMapLoading, getCurrentModel } = useModels();
  const filters: DataFilter[] | undefined = monitor?.data_filters?.filters;
  const frequency: number = FrequencyMap[monitor.frequency];

  const {
    data: checks,
    isLoading: isChecksLoading,
    refetch
  } = useGetChecksApiV1ModelsModelIdChecksGet(modelId, undefined, {
    query: {
      enabled: false
    }
  });

  useEffect(() => {
    if (modelId && modelId > -1) {
      refetch();
    }
  }, [modelId, refetch]);

  const [fetching, setFetching] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  const [prevPeriod, setPrevPeriod] = useState(false);
  const [featuresArray, setFeaturesArray] = useState<ControlledMarkedSelectSelectValues[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<ControlledMarkedSelectSelectValues>();
  const checksArray = useMemo(() => checks?.map(c => c.name) || [], [checks]);
  const [selectedCheck, setSelectedCheck] = useState<ControlledMarkedSelectSelectValues>();

  const [groupBySchema, setGroupBySchema] = useState<CheckGroupBySchema[]>([]);
  const [datasetsNamesArray, setDatasetsNamesArray] = useState<ControlledMarkedSelectSelectValues[]>([]);
  const [selectedDatasetName, setSelectedDatasetName] = useState<ControlledMarkedSelectSelectValues>('');

  const currentCheck = useMemo(() => checks?.find(c => c.name === selectedCheck), [checks, selectedCheck]);
  const currenModelVersionId = useMemo(
    () => getCurrentModel(currentCheck?.model_id || -1)?.versions?.[0]?.id,
    [getCurrentModel, currentCheck?.model_id]
  );

  const activeFilters = useMemo(() => filters || [], [filters]);

  useEffect(() => {
    setSelectedCheck(checksArray.find(c => c == monitor.check.name));
  }, [checksArray, monitor]);

  useEffect(() => {
    const datasetsNames = Object.keys(groupBySchema[0]?.value || {});
    setDatasetsNamesArray(datasetsNames);
  }, [groupBySchema]);

  useEffect(() => {
    setSelectedDatasetName(datasetsNamesArray[0]);
  }, [datasetsNamesArray]);

  useEffect(() => {
    async function getData() {
      if (currenModelVersionId) {
        setFetching(true);

        const featuresNames = await getAvailableFeaturesNames(currenModelVersionId);

        setFeaturesArray(featuresNames);
        setSelectedFeature(featuresNames[0]);

        setFetching(false);
      }
    }

    getData();
  }, [currenModelVersionId]);

  useEffect(() => {
    async function runCheckGroupByFeature() {
      if (currentCheck?.id && modelVersionId && typeof selectedFeature === 'string') {
        setFetching(true);

        const resp = await runCheckGroupByFeatureApiV1ChecksCheckIdGroupByModelVersionIdFeaturePost(
          currentCheck.id,
          modelVersionId,
          selectedFeature,
          singleCheckRunOptions
        );

        setGroupBySchema(resp ? resp : []);

        setFetching(false);
      }
    }

    runCheckGroupByFeature();
  }, [currentCheck?.id, modelVersionId, selectedFeature, singleCheckRunOptions]);

  const loading = tabIndex === 0 ? isChecksLoading || fetching || groupBySchema.length === 0 : isModelMapLoading;

  return (
    <StyledContainer>
      <AlertsDrillDownToAnalysisHeader
        tabIndex={tabIndex}
        setTabIndex={setTabIndex}
        prevPeriod={prevPeriod}
        setPrevPeriod={setPrevPeriod}
        featuresNames={featuresArray}
        selectedFeature={selectedFeature}
        setSelectedFeature={setSelectedFeature}
        checksNames={checksArray}
        selectedCheck={selectedCheck}
        setSelectedCheck={setSelectedCheck}
        datasetsNames={datasetsNamesArray}
        selectedDatasetName={selectedDatasetName}
        setSelectedDatasetName={setSelectedDatasetName}
        disabled={loading}
      />
      <Box height={loading ? '80%' : 'auto'}>
        {loading ? (
          <Loader />
        ) : (
          <>
            <TabPanel value={tabIndex} index={0}>
              {currentCheck && modelVersionId && (
                <SegmentsDrillDown
                  data={groupBySchema}
                  check={currentCheck}
                  datasetName={selectedDatasetName}
                  singleCheckRunOptions={singleCheckRunOptions}
                  modelVersionId={modelVersionId}
                />
              )}
            </TabPanel>
            <TabPanel value={tabIndex} index={1}>
              <Stack
                spacing="30px"
                sx={{
                  padding: '26px 40px 30px'
                }}
              >
                {checks?.map(check => (
                  <AnalysisItem
                    key={check.id}
                    check={check}
                    lastUpdate={NOW}
                    compareWithPreviousPeriod={prevPeriod}
                    period={period}
                    frequency={frequency}
                    activeFilters={activeFilters}
                    height={420}
                    graphHeight={250}
                  />
                ))}
              </Stack>
            </TabPanel>
          </>
        )}
      </Box>
    </StyledContainer>
  );
};

const StyledContainer = styled(Box)({
  flex: 1,
  background: theme.palette.grey[100]
});

export const AlertsDrillDownToAnalysis = memo(AlertsDrillDownToAnalysisComponent);
