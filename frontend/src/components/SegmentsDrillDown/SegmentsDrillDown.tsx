import React, { useMemo, useState, useEffect, memo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';

import { CheckGroupBySchema, DataFilter } from 'api/generated';

import { styled, Box } from '@mui/material';

import { SegmentTests } from './components/SegmentTests';
import { NoGraphDataToShow } from './components/NoGraphDataToShow';
import { CheckPerSegment } from './components/CheckPerSegment';

import { ControlledMarkedSelectSelectValues } from 'components/MarkedSelect/ControlledMarkedSelect';

interface SegmentsDrillDownProps {
  data: CheckGroupBySchema[];
  datasetName: ControlledMarkedSelectSelectValues;
  checkName: ControlledMarkedSelectSelectValues;
  setActiveBarFilters?: React.Dispatch<React.SetStateAction<DataFilter[]>>;
  feature?: string;
}

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const SegmentsDrillDownComponent = ({
  data,
  datasetName,
  checkName,
  setActiveBarFilters,
  feature
}: SegmentsDrillDownProps) => {
  const dataSet: number[] = useMemo(
    () => (data.length && datasetName ? data.map(d => (d.value ? d.value[datasetName] : 0)) : []),
    [data, datasetName]
  );

  const labels = useMemo(() => (data.length ? data.map(d => d.name || JSON.stringify(d.name)) : []), [data]);
  const allDataIsZeros = useMemo(() => dataSet.every(d => d === 0), [dataSet]);

  const [activeBarIndex, setActiveBarIndex] = useState(0);
  const [activeBarName, setActiveBarName] = useState(labels[0]);
  const [title, setTitle] = useState<string>();

  const plots = data ? (data[activeBarIndex]?.display as string[]) : [];

  useEffect(() => {
    if (setActiveBarFilters && data && data[activeBarIndex] && data[activeBarIndex].filters) {
      setActiveBarFilters(data[activeBarIndex].filters.filters);
    }

    setTitle(`${checkName} On Segment: ${activeBarName}`);
  }, [activeBarIndex, data, setActiveBarFilters, activeBarName, checkName]);

  return (
    <StyledContainer>
      {allDataIsZeros || !dataSet.length ? (
        <NoGraphDataToShow />
      ) : (
        <>
          <CheckPerSegment
            dataSet={dataSet}
            labels={labels}
            setActiveBarName={setActiveBarName}
            activeBarIndex={activeBarIndex}
            setActiveBarIndex={setActiveBarIndex}
            yTitle={`${checkName} ${datasetName}`}
            xTitle={feature}
          />
          <SegmentTests title={title} plots={plots.map(plot => JSON.parse(plot))} />
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
