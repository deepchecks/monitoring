import React, { memo, useEffect, useContext, useState, useCallback } from 'react';

import {
  CheckGroupBySchema,
  getSchemaApiV1ModelVersionsModelVersionIdSchemaGet,
  runCheckGroupByFeatureApiV1ChecksCheckIdGroupByModelVersionIdFeaturePost,
  SingleWindowMonitorOptions
} from 'api/generated';
import { AnalysisContext } from 'context/analysis-context';

import { Drawer, styled } from '@mui/material';

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
  const [singleWindowMonitorOptions, setSingleWindowMonitorOptions] = useState<SingleWindowMonitorOptions | null>(null);
  const [featuresArray, setFeaturesArray] = useState<string[]>([]);
  const [feature, setFeature] = useState<string>();
  const [groupBySchema, setGroupBySchema] = useState<CheckGroupBySchema[]>([]);

  const runCheckGroupByFeature = useCallback(
    async (selectedFeature: string, singleWindowMonitorOptions: SingleWindowMonitorOptions) => {
      if (check && modelVersionId) {
        setLoading(true);

        const resp = await runCheckGroupByFeatureApiV1ChecksCheckIdGroupByModelVersionIdFeaturePost(
          check.id,
          modelVersionId,
          selectedFeature,
          singleWindowMonitorOptions
        );

        setGroupBySchema(resp);
        setLoading(false);
      }
    },
    [check, modelVersionId]
  );

  useEffect(() => {
    async function getData() {
      setGlobalLoading(true);
      setLoading(true);

      if (timeLabel && modelVersionId && check && datasetName) {
        const response = (await getSchemaApiV1ModelVersionsModelVersionIdSchemaGet(modelVersionId)) as FeaturesResponse;
        const features = Object.keys(response.features);

        setFeaturesArray(features);
        setFeature(features[0]);

        const singleWindowMonitorOptions: SingleWindowMonitorOptions = {
          start_time: new Date(timeLabel - frequency * 1000).toISOString(),
          end_time: new Date(timeLabel).toISOString(),
          ...(activeFilters.length && { filter: { filters: activeFilters } }),
          ...(additionalKwargs && { additional_kwargs: additionalKwargs })
        };

        setSingleWindowMonitorOptions(singleWindowMonitorOptions);

        if (additionalKwargs && type) {
          const value =
            type === CheckTypeOptions.Class
              ? datasetName.replace(additionalKwargs.check_conf.scorer[0], '').trim()
              : datasetName;

          value && setClassOrFeature({ type, value });
        }
      }

      setGlobalLoading(false);
    }

    getData();

    return () => {
      setSingleWindowMonitorOptions(null);
      setClassOrFeature(null);
      setGroupBySchema([]);
      setFeaturesArray([]);
      setFeature('');
    };
  }, [
    activeFilters,
    additionalKwargs,
    check,
    datasetName,
    runCheckGroupByFeature,
    frequency,
    modelVersionId,
    timeLabel,
    type
  ]);

  useEffect(() => {
    if (feature && singleWindowMonitorOptions) {
      runCheckGroupByFeature(feature, singleWindowMonitorOptions);
    }
  }, [feature, runCheckGroupByFeature, singleWindowMonitorOptions]);

  return (
    <StyledDrawer anchor="right" {...props}>
      {check &&
        singleWindowMonitorOptions &&
        (globalLoading ? (
          <Loader />
        ) : (
          <>
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
              feature={feature}
              setFeature={setFeature}
              disabled={loading}
            />
            {datasetName &&
              check.name &&
              (loading ? (
                <Loader />
              ) : (
                <DataGraphs checkName={check.name} datasetName={datasetName} data={groupBySchema} />
              ))}
          </>
        ))}
    </StyledDrawer>
  );
};

export const AnalysisGroupBy = memo(AnalysisGroupByComponent);

const StyledDrawer = styled(Drawer)({
  '& .MuiPaper-root': {
    width: '1090px',
    padding: '40px'
  }
});
