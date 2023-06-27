import React, { useMemo, useState, useEffect, memo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';

import {
  CheckGroupBySchema,
  CheckSchema,
  DataFilter,
  getCheckDisplayApiV1ChecksCheckIdDisplayModelVersionIdPost,
  SingleCheckRunOptions,
  GetCheckDisplayApiV1ChecksCheckIdDisplayModelVersionIdPost200Item
} from 'api/generated';

import { styled, Box } from '@mui/material';

import { SegmentTests } from './components/SegmentTests';
import { NoGraphDataToShow } from './components/NoGraphDataToShow';
import { CheckPerSegment } from './components/CheckPerSegment';
import { ClassOrFeature } from 'components/AnalysisDrillDown/AnalysisDrillDown.types';
import { Loader } from 'components/base/Loader/Loader';

import { ControlledMarkedSelectSelectValues } from 'components/base/MarkedSelect/ControlledMarkedSelect';

import { getKeyByDatasetName } from './SegmentsDrillDown.helpers';

interface SegmentsDrillDownProps {
  data: CheckGroupBySchema[];
  datasetName: ControlledMarkedSelectSelectValues;
  check: CheckSchema;
  setActiveBarFilters?: React.Dispatch<React.SetStateAction<DataFilter[]>>;
  feature?: string;
  classOrFeature?: ClassOrFeature | null;
  modelVersionId: number;
  singleCheckRunOptions: SingleCheckRunOptions;
}

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const SegmentsDrillDownComponent = ({
  data,
  datasetName,
  check,
  setActiveBarFilters,
  feature,
  classOrFeature,
  modelVersionId,
  singleCheckRunOptions
}: SegmentsDrillDownProps) => {
  const dataSet: Array<number | null> = useMemo(
    () =>
      data.length && datasetName
        ? data.map(d => (d.value ? d.value[getKeyByDatasetName(d.value, '' + datasetName) || ''] : null))
        : [],
    [data, datasetName]
  );

  const labels = useMemo(() => (data.length ? data.map(d => d.name || JSON.stringify(d.name)) : []), [data]);
  const yTitle = useMemo(
    () => (classOrFeature?.type === 'Feature' ? `${check.name} - ${datasetName}` : `${datasetName}`),
    [check, datasetName, classOrFeature]
  );

  const [allPlots, setAllPlots] = useState<
    Record<number, GetCheckDisplayApiV1ChecksCheckIdDisplayModelVersionIdPost200Item[]>
  >({});
  const [plots, setPlots] = useState<GetCheckDisplayApiV1ChecksCheckIdDisplayModelVersionIdPost200Item[] | null>(null);
  const [activeBarIndex, setActiveBarIndex] = useState(0);
  const [activeBarName, setActiveBarName] = useState(labels[0]);
  const [title, setTitle] = useState<string>();

  useEffect(() => {
    async function loadDisplay(data: CheckGroupBySchema) {
      const newFilters = data.filters.filters.concat(singleCheckRunOptions?.filter?.filters || []);
      const options = { ...singleCheckRunOptions, filter: { filters: newFilters } };
      const resp = await getCheckDisplayApiV1ChecksCheckIdDisplayModelVersionIdPost(check.id, modelVersionId, options);
      setAllPlots(prevState => ({ ...prevState, [activeBarIndex]: resp }));
      setPlots(resp);
    }

    if (setActiveBarFilters && data && data[activeBarIndex] && data[activeBarIndex].filters) {
      setActiveBarFilters(data[activeBarIndex].filters.filters);
    }

    setTitle(`${check.name} On Segment: ${activeBarName}`);

    // Load display
    if (allPlots[activeBarIndex]) {
      setPlots(allPlots[activeBarIndex]);
    } else {
      setPlots(null);
      loadDisplay(data[activeBarIndex]);
    }
  }, [activeBarIndex, data, setActiveBarFilters, activeBarName, check]);

  return (
    <StyledContainer>
      {!dataSet.length ? (
        <NoGraphDataToShow />
      ) : (
        <>
          <CheckPerSegment
            segmentData={data}
            dataSet={dataSet}
            labels={labels}
            setActiveBarName={setActiveBarName}
            activeBarIndex={activeBarIndex}
            setActiveBarIndex={setActiveBarIndex}
            yTitle={yTitle}
            xTitle={feature}
          />
          {plots ? <SegmentTests title={title} plots={plots} /> : <Loader />}
        </>
      )}
    </StyledContainer>
  );
};

const StyledContainer = styled(Box)({
  overflow: 'overlay',
  padding: '20px 40px 20px',
  scrollbarWidth: 'thin',

  '::-webkit-scrollbar': {
    webkitAppearance: 'none',
    width: '7px'
  },

  '::-webkit-scrollbar-thumb': {
    borderRadius: '4px',
    backgroundColor: 'rgba(0,0,0,.5)',
    webkitBoxShadow: '0 0 1px rgba(255,255,255,.5)'
  }
});

export const SegmentsDrillDown = memo(SegmentsDrillDownComponent);
