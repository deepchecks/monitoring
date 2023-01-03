import React, { memo, useEffect, useContext, useState } from 'react';

import {
  CheckGroupBySchema,
  DataFilter,
  getSchemaApiV1ModelVersionsModelVersionIdSchemaGet,
  runCheckGroupByFeatureApiV1ChecksCheckIdGroupByModelVersionIdFeaturePost,
  SingleCheckRunOptions
} from 'api/generated';
import { AnalysisContext } from 'context/analysis-context';

import { styled, Box } from '@mui/material';

import { AnalysisGroupByInfo } from './components/AnalysisGroupByInfo';
import { Loader } from 'components/Loader';
import { CustomDrawer, CustomDrawerHeader } from 'components/CustomDrawer';
import {
  ControlledMarkedSelect,
  ControlledMarkedSelectSelectValues
} from 'components/MarkedSelect/ControlledMarkedSelect';
import { SegmentsDrillDown } from 'components/SegmentsDrillDown';
import { RunDownloadSuite } from 'components/RunDownloadSuite';

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
  const [singleCheckRunOptions, setSingleCheckRunOptions] = useState<SingleCheckRunOptions | null>(null);
  const [featuresArray, setFeaturesArray] = useState<ControlledMarkedSelectSelectValues[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<ControlledMarkedSelectSelectValues>();
  const [groupBySchema, setGroupBySchema] = useState<CheckGroupBySchema[]>([]);
  const [activeBarFilters, setActiveBarFilters] = useState<DataFilter[]>([]);

  const propValuesAreNotNull = !!(datasetName && check && modelVersionId && timeLabel);
  const testSuitePropsAreNotNull = !!(selectedFeature && modelVersionId && singleCheckRunOptions);

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

        const SingleCheckRunOptions: SingleCheckRunOptions = {
          start_time: new Date(timeLabel - frequency * 1000).toISOString(),
          end_time: new Date(timeLabel).toISOString(),
          filter: { filters: activeFilters.length ? activeFilters : [] },
          ...(additionalKwargs && { additional_kwargs: additionalKwargs })
        };

        setSingleCheckRunOptions(SingleCheckRunOptions);

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
    async function runCheckGroupByFeature() {
      if (singleCheckRunOptions && check && modelVersionId && typeof selectedFeature === 'string') {
        setLoading(true);

        const resp = await runCheckGroupByFeatureApiV1ChecksCheckIdGroupByModelVersionIdFeaturePost(
          check.id,
          modelVersionId,
          selectedFeature,
          singleCheckRunOptions
        );

        setGroupBySchema(resp ? resp : []);
        setLoading(false);
        setGlobalLoading(false);
      }
    }

    runCheckGroupByFeature();
  }, [selectedFeature, singleCheckRunOptions, check, modelVersionId]);

  return (
    <CustomDrawer loading={globalLoading} {...props}>
      {propValuesAreNotNull && singleCheckRunOptions && (
        <>
          <StyledHeaderContainer>
            <CustomDrawerHeader title={check.name || 'none'} onClick={onCloseIconClick} marginBottom="32px" />
            <AnalysisGroupByInfo
              startTime={singleCheckRunOptions.start_time}
              endTime={singleCheckRunOptions.end_time}
              frequency={frequencyLabel}
              checkName={check.name || 'none'}
              modelName={modelName}
              classOrFeature={classOrFeature}
            />
            <StyledControlledMarkedSelect
              label="Select Feature"
              value={selectedFeature}
              values={featuresArray}
              disabled={loading}
              setValue={setSelectedFeature}
            />
          </StyledHeaderContainer>
          {loading ? (
            <Loader />
          ) : (
            <>
              <SegmentsDrillDown
                data={groupBySchema}
                checkName={check.name}
                datasetName={datasetName}
                setActiveBarFilters={setActiveBarFilters}
              />
              {testSuitePropsAreNotNull && (
                <StyledRunDownloadSuiteContainer>
                  <RunDownloadSuite
                    testSuiteButtonLabel="Run Test Suite"
                    activeBarFilters={activeBarFilters}
                    modelVersionId={modelVersionId}
                    notebookType="check"
                    notebookId={check.id}
                    notebookName={check.name}
                    singleCheckRunOptions={singleCheckRunOptions}
                  />
                </StyledRunDownloadSuiteContainer>
              )}
            </>
          )}
        </>
      )}
    </CustomDrawer>
  );
};

export const AnalysisGroupBy = memo(AnalysisGroupByComponent);

const StyledHeaderContainer = styled(Box)({
  padding: '40px 40px 0'
});

const StyledControlledMarkedSelect = styled(ControlledMarkedSelect)({
  width: '276px',
  marginBottom: '14px'
});

const StyledRunDownloadSuiteContainer = styled(Box)({
  margin: 'auto 36px 25px auto',
  paddingTop: '25px'
});
