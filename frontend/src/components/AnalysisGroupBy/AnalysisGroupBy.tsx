import React, { memo, useEffect, useContext, useState, useCallback } from 'react';

import {
  CheckGroupBySchema,
  getSchemaApiV1ModelVersionsModelVersionIdSchemaGet,
  runCheckGroupByFeatureApiV1ChecksCheckIdGroupByModelVersionIdFeaturePost,
  SingleCheckRunOptions
} from 'api/generated';
import { AnalysisContext } from 'context/analysis-context';

import { Drawer, styled, Box } from '@mui/material';

import { AnalysisGroupByInfo } from './components/AnalysisGroupByInfo';
import { AnalysisGroupByHeader } from './components/AnalysisGroupByHeader';
import { AnalysisGroupByFeaturesSelect } from './components/AnalysisGroupByFeaturesSelect';
import { DataGraphs } from './components/DataGraphs';
import { Loader } from 'components/Loader';

import { CheckTypeOptions } from 'helpers/types/check';
import { ClassOrFeature, AnalysisGroupByProps, FeaturesResponse } from './AnalysisGroupBy.types';

const AnalysisGroupByComponent = ({
  datasetName,
  modelName,
  check,
  modelVersionId,
  timeLabel,
  additionalKwargs,
  onCloseIconClick,
  type,
  ...props
}: AnalysisGroupByProps) => {
  const { frequency, activeFilters, frequencyLabel } = useContext(AnalysisContext);

  const [globalLoading, setGlobalLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const [classOrFeature, setClassOrFeature] = useState<ClassOrFeature | null>(null);
  const [singleWindowMonitorOptions, setSingleCheckRunOptions] = useState<SingleCheckRunOptions | null>(null);
  const [featuresArray, setFeaturesArray] = useState<string[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<string>();
  const [groupBySchema, setGroupBySchema] = useState<CheckGroupBySchema[]>([]);

  const propValuesAreNotNull = !!(datasetName && check && modelVersionId && timeLabel);

  const runCheckGroupByFeature = useCallback(
    async (selectedFeature: string, singleWindowMonitorOptions: SingleCheckRunOptions) => {
      if (check && modelVersionId) {
        setLoading(true);

        const resp = await runCheckGroupByFeatureApiV1ChecksCheckIdGroupByModelVersionIdFeaturePost(
          check.id,
          modelVersionId,
          selectedFeature,
          singleWindowMonitorOptions
        );

        setGroupBySchema(resp ? resp : []);
        setLoading(false);
        setGlobalLoading(false);
      }
    },
    [check, modelVersionId]
  );

  useEffect(() => {
    async function getData() {
      if (propValuesAreNotNull) {
        setGlobalLoading(true);

        const { features } = (await getSchemaApiV1ModelVersionsModelVersionIdSchemaGet(
          modelVersionId
        )) as FeaturesResponse;
        const featuresNames = Object.keys(features);
        setFeaturesArray(featuresNames);
        setSelectedFeature(featuresNames[0]);

        const singleWindowMonitorOptions: SingleCheckRunOptions = {
          start_time: new Date(timeLabel - frequency * 1000).toISOString(),
          end_time: new Date(timeLabel).toISOString(),
          filter: { filters: activeFilters.length ? activeFilters : [] },
          ...(additionalKwargs && { additional_kwargs: additionalKwargs })
        };

        setSingleCheckRunOptions(singleWindowMonitorOptions);

        if (additionalKwargs && type) {
          const value =
            type === CheckTypeOptions.Class
              ? datasetName.replace(additionalKwargs.check_conf.scorer[0], '').trim()
              : datasetName;

          value && setClassOrFeature({ type, value });
        }
      }
    }

    getData();

    return () => {
      setSingleCheckRunOptions(null);
      setClassOrFeature(null);
      setGroupBySchema([]);
      setFeaturesArray([]);
      setSelectedFeature('');
    };
  }, [activeFilters, additionalKwargs, datasetName, frequency, modelVersionId, propValuesAreNotNull, timeLabel, type]);

  useEffect(() => {
    if (selectedFeature && singleWindowMonitorOptions) {
      runCheckGroupByFeature(selectedFeature, singleWindowMonitorOptions);
    }
  }, [selectedFeature, runCheckGroupByFeature, singleWindowMonitorOptions]);

  return (
    <StyledDrawer anchor="right" {...props}>
      {propValuesAreNotNull &&
        singleWindowMonitorOptions &&
        (globalLoading ? (
          <Loader />
        ) : (
          <>
            <StyledHeaderContainer>
              <AnalysisGroupByHeader title={check.name || 'none'} onClick={onCloseIconClick} />
              <AnalysisGroupByInfo
                startTime={singleWindowMonitorOptions.start_time}
                endTime={singleWindowMonitorOptions.end_time}
                frequency={frequencyLabel}
                checkName={check.name || 'none'}
                modelName={modelName}
                classOrFeature={classOrFeature}
              />
              <AnalysisGroupByFeaturesSelect
                features={featuresArray}
                feature={selectedFeature}
                setFeature={setSelectedFeature}
                disabled={loading}
              />
            </StyledHeaderContainer>
            {loading ? (
              <Loader />
            ) : (
              <DataGraphs
                checkName={check.name}
                checkId={check.id}
                datasetName={datasetName}
                data={groupBySchema}
                selectedFeature={selectedFeature}
                modelVersionId={modelVersionId}
                singleWindowMonitorOptions={singleWindowMonitorOptions}
              />
            )}
          </>
        ))}
    </StyledDrawer>
  );
};

export const AnalysisGroupBy = memo(AnalysisGroupByComponent);

const StyledDrawer = styled(Drawer)({
  '& .MuiPaper-root': {
    width: '1090px'
  }
});

const StyledHeaderContainer = styled(Box)({
  padding: '40px 40px 0'
});
