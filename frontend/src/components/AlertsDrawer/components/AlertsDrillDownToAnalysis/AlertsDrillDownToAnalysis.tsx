import React, { memo, useState, useEffect, useMemo } from 'react';

import {
  DataFilter,
  useGetChecksApiV1ModelsModelIdChecksGet,
  getSchemaApiV1ModelVersionsModelVersionIdSchemaGet,
  SingleCheckRunOptions,
  runCheckGroupByFeatureApiV1ChecksCheckIdGroupByModelVersionIdFeaturePost,
  CheckGroupBySchema,
  MonitorSchema
} from 'api/generated';
import { ComparisonModeOptions } from 'context/analysis-context';
import { useModels } from 'hooks/useModels';

import { Box, Stack, styled } from '@mui/material';

import { AlertsDrillDownToAnalysisHeader } from './AlertsDrillDownToAnalysisHeader';
import { TabPanel } from 'components/TabPanel';
import { Loader } from 'components/Loader';
import { AnalysisItem } from 'components/AnalysisItem';
import { SegmentsDrillDown } from 'components/SegmentsDrillDown';

import { colors } from 'theme/colors';

import { FeaturesResponse } from 'components/AnalysisGroupBy/AnalysisGroupBy.types';
import { ControlledMarkedSelectSelectValues } from 'components/MarkedSelect/ControlledMarkedSelect';

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
  const frequency: number = monitor.frequency;

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

        const { features } = (await getSchemaApiV1ModelVersionsModelVersionIdSchemaGet(
          currenModelVersionId
        )) as FeaturesResponse;

        const featuresNames = Object.keys(features);
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
              <SegmentsDrillDown data={groupBySchema} checkName={selectedCheck} datasetName={selectedDatasetName} />
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
                    isComparisonModeOn={prevPeriod}
                    comparisonMode={ComparisonModeOptions.previousPeriod}
                    period={period}
                    frequency={frequency}
                    activeFilters={activeFilters}
                    height={359}
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
  background: colors.neutral.grey[100]
});

export const AlertsDrillDownToAnalysis = memo(AlertsDrillDownToAnalysisComponent);
