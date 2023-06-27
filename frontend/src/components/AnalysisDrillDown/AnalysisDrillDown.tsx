import React, { memo, useEffect, useContext, useState } from 'react';
import dayjs, { ManipulateType } from 'dayjs';
import utc from 'dayjs/plugin/utc';

import {
  CheckGroupBySchema,
  DataFilter,
  runCheckGroupByFeatureApiV1ChecksCheckIdGroupByModelVersionIdFeaturePost,
  SingleCheckRunOptions
} from 'api/generated';
import { AnalysisContext } from 'helpers/context/AnalysisProvider';

import { styled, Box } from '@mui/material';

import { AnalysisDrillDownInfo } from './AnalysisDrillDownInfo/AnalysisDrillDownInfo';
import { Loader } from 'components/base/Loader/Loader';
import { CustomDrawer, CustomDrawerHeader } from 'components/CustomDrawer';
import {
  ControlledMarkedSelect,
  ControlledMarkedSelectSelectValues
} from 'components/base/MarkedSelect/ControlledMarkedSelect';
import { SegmentsDrillDown } from 'components/SegmentsDrillDown';
import { RunDownloadSuite } from 'components/SuiteView/RunDownloadSuite';

import { CheckTypeOptions } from 'helpers/types/check';
import { ClassOrFeature, AnalysisDrillDownProps } from './AnalysisDrillDown.types';
import { getAvailableFeatures } from 'helpers/utils/featuresUtils';
import { SwitchButton } from 'components/base/Button/SwitchButton';

dayjs.extend(utc);

function getDayJsManipulateType(frequency: number): ManipulateType {
  switch (frequency) {
    case 3600:
      return 'hour';

    case 86400:
      return 'day';

    case 604800:
      return 'week';

    case 2592000:
      return 'month';

    default:
      return 'day';
  }
}

const AnalysisDrillDownComponent = ({
  datasetName,
  modelName,
  check,
  modelVersionId,
  timeLabel,
  additionalKwargs,
  onCloseIconClick,
  type,
  ...props
}: AnalysisDrillDownProps) => {
  const { frequency, activeFilters } = useContext(AnalysisContext);

  const [globalLoading, setGlobalLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const [classOrFeature, setClassOrFeature] = useState<ClassOrFeature | null>(null);
  const [singleCheckRunOptions, setSingleCheckRunOptions] = useState<SingleCheckRunOptions | null>(null);
  const [featuresArray, setFeaturesArray] = useState<ControlledMarkedSelectSelectValues[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<ControlledMarkedSelectSelectValues>();
  const [groupBySchema, setGroupBySchema] = useState<CheckGroupBySchema[]>([]);
  const [activeBarFilters, setActiveBarFilters] = useState<DataFilter[]>([]);

  const [featureImportance, setFeatureImportance] = useState<Record<string, number> | null>(null);
  const [sortByFi, setSortByFi] = useState(true);

  const propValuesAreNotNull = !!(datasetName && check && modelVersionId && timeLabel);
  const testSuitePropsAreNotNull = !!(selectedFeature && modelVersionId && singleCheckRunOptions);

  const filterFeatureNames = (featuresNames: string[]) => {
    if (additionalKwargs && type) {
      const value = type === CheckTypeOptions.Class ? additionalKwargs.res_conf?.[0] : datasetName;

      if (value) {
        // if the type is feature we want to only show dataset name if a feature is selected
        if (type != CheckTypeOptions.Feature || additionalKwargs.check_conf?.['feature']?.length) {
          setClassOrFeature({ type, value });
        }
        // Filter selected feature from feature list
        if (type === CheckTypeOptions.Feature) {
          return featuresNames.filter(feature => feature != value);
        }
      }
    }
    return featuresNames;
  };

  useEffect(() => {
    async function getData() {
      if (propValuesAreNotNull && frequency) {
        setGlobalLoading(true);

        const { featuresNames, featureImportance } = await getAvailableFeatures(modelVersionId, sortByFi);
        setFeatureImportance(featureImportance);

        const SingleCheckRunOptions: SingleCheckRunOptions = {
          start_time: dayjs.utc(timeLabel).subtract(1, getDayJsManipulateType(frequency)).toISOString(),
          end_time: new Date(timeLabel).toISOString(),
          filter: { filters: activeFilters.length ? activeFilters : [] },
          ...(additionalKwargs && { additional_kwargs: additionalKwargs })
        };

        setSingleCheckRunOptions(SingleCheckRunOptions);

        setFeaturesArray(filterFeatureNames(featuresNames));
        setSelectedFeature(featuresNames[0]);
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

  const getTitle = () => {
    if (!check || !check.name) {
      return '';
    } else if (classOrFeature) {
      return `${check.name} - ${classOrFeature.value}`;
    } else {
      return check.name;
    }
  };

  const updateFeaturesSort = (checked: boolean) => {
    let featuresNames;
    if (checked && featureImportance != null && Object.keys(featureImportance).length > 0) {
      featuresNames = Object.keys(featureImportance).sort((a, b) => featureImportance[b] - featureImportance[a]);
    } else {
      featuresNames = (Object.values(featuresArray) as string[]).sort();
    }
    setFeaturesArray(filterFeatureNames(featuresNames));
    setSortByFi(checked);
  };

  return (
    <CustomDrawer loading={globalLoading} {...props}>
      {propValuesAreNotNull && singleCheckRunOptions && (
        <>
          <StyledHeaderContainer>
            <CustomDrawerHeader title={getTitle()} onClick={onCloseIconClick} marginBottom="32px" />
            <AnalysisDrillDownInfo
              startTime={singleCheckRunOptions.start_time}
              endTime={singleCheckRunOptions.end_time}
              checkName={check.name || ''}
              modelName={modelName}
              classOrFeature={classOrFeature}
            />
            <StyledControlledMarkedSelect
              label="Group By Feature"
              value={selectedFeature}
              values={featuresArray}
              disabled={loading}
              setValue={setSelectedFeature}
            />
            {featureImportance && (
              <SwitchButton
                sx={{ marginLeft: '16px', height: '38px' }}
                checked={sortByFi}
                setChecked={checked => updateFeaturesSort(checked as boolean)}
                label="Sort by feature importance"
              />
            )}
          </StyledHeaderContainer>
          {loading ? (
            <Loader />
          ) : (
            <>
              <SegmentsDrillDown
                data={groupBySchema}
                check={check}
                datasetName={datasetName}
                setActiveBarFilters={setActiveBarFilters}
                feature={selectedFeature?.toString() || ''}
                classOrFeature={classOrFeature}
                singleCheckRunOptions={singleCheckRunOptions}
                modelVersionId={modelVersionId}
              />
              {testSuitePropsAreNotNull && (
                <StyledRunDownloadSuiteContainer>
                  <RunDownloadSuite
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

export const AnalysisDrillDown = memo(AnalysisDrillDownComponent);

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
