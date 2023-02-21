import React, { useMemo, useState, useEffect, memo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';

import { CheckGroupBySchema, CheckSchema, CheckGroupBySchemaValue, DataFilter,
  getCheckDisplayApiV1ChecksCheckIdDisplayModelVersionIdPost,SingleCheckRunOptions } from 'api/generated';


import { styled, Box } from '@mui/material';

import { SegmentTests } from './components/SegmentTests';
import { NoGraphDataToShow } from './components/NoGraphDataToShow';
import { CheckPerSegment } from './components/CheckPerSegment';
import { ClassOrFeature } from 'components/AnalysisGroupBy/AnalysisGroupBy.types';
import { Loader } from 'components/Loader';

import { ControlledMarkedSelectSelectValues } from 'components/MarkedSelect/ControlledMarkedSelect';

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

function stringNameFix(str: string) {
  return str.replaceAll('_', ' ').toLowerCase();
}

function getKeyByDatasetname(obj: CheckGroupBySchemaValue, name: string) {
  return Object.keys(obj).find(key => stringNameFix(key) == stringNameFix(name));
}

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
  const dataSet: Array<number|null> = useMemo(
    () => (data.length && datasetName ? data.map(d => (
      d.value ? d.value[getKeyByDatasetname(d.value, '' + datasetName) || ''] : null)) : []
    ),
    [data, datasetName]
  );

  const labels = useMemo(() => (data.length ? data.map(d => d.name || JSON.stringify(d.name)) : []), [data]);
  const yTitle = useMemo(() => classOrFeature?.type === 'Feature' ? `${check.name} - ${datasetName}` : `${datasetName}`,
    [check, datasetName, classOrFeature]
  );

  const [allPlots, setAllPlots] = useState<Record<number, string[]>>({});
  const [plots, setPlots] = useState<string[] | null>(null);
  const [activeBarIndex, setActiveBarIndex] = useState(0);
  const [activeBarName, setActiveBarName] = useState(labels[0]);
  const [title, setTitle] = useState<string>();

  useEffect(() => {
    async function loadDisplay(data: CheckGroupBySchema) {
      const options = {...singleCheckRunOptions, filter: data.filters};
      const resp = await getCheckDisplayApiV1ChecksCheckIdDisplayModelVersionIdPost(check.id, modelVersionId, options)
      setAllPlots(prevState => ({...prevState, [activeBarIndex]: resp}))
      setPlots(resp);
    }

    if (setActiveBarFilters && data && data[activeBarIndex] && data[activeBarIndex].filters) {
      setActiveBarFilters(data[activeBarIndex].filters.filters);
    }

    setTitle(`${check.name} On Segment: ${activeBarName}`);

    // Load display
    if (allPlots[activeBarIndex]) {
      setPlots(allPlots[activeBarIndex]);
    }
    else {
      setPlots(null)
      loadDisplay(data[activeBarIndex])
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
          {plots ? <SegmentTests title={title} plots={plots.map(plot => JSON.parse(plot))} /> : <Loader />}
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
    '-webkit-appearance': 'none',
    width: '7px'
  },

  '::-webkit-scrollbar-thumb': {
    borderRadius: '4px',
    backgroundColor: 'rgba(0,0,0,.5)',
    '-webkit-box-shadow': '0 0 1px rgba(255,255,255,.5)'
  }
});

export const SegmentsDrillDown = memo(SegmentsDrillDownComponent);
