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
}

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const SegmentsDrillDownComponent = ({ data, datasetName, checkName, setActiveBarFilters }: SegmentsDrillDownProps) => {
  const dataSet: number[] = useMemo(
    () => (data.length && datasetName ? data.map(d => (d.value ? d.value[datasetName] : 0)) : []),
    [data, datasetName]
  );

  const labels = useMemo(() => (data.length ? data.map(d => d.name || JSON.stringify(d.name)) : []), [data]);
  const allDataIsZeros = useMemo(() => dataSet.every(d => d === 0), [dataSet]);

  const [activeBarIndex, setActiveBarIndex] = useState(0);
  const [activeBarName, setActiveBarName] = useState(labels[0]);

  const plots = data ? (data[activeBarIndex]?.display as string[]) : [];

  useEffect(() => {
    if (setActiveBarFilters && data && data[activeBarIndex] && data[activeBarIndex].filters) {
      setActiveBarFilters(data[activeBarIndex].filters.filters);
    }
  }, [activeBarIndex, data, setActiveBarFilters]);

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
          />
          <SegmentTests
            activeBarName={activeBarName}
            checkName={checkName}
            plots={plots.map(plot => JSON.parse(plot))}
          />
        </>
      )}
    </StyledContainer>
  );
};

const StyledContainer = styled(Box)({
  overflow: 'overlay',
  padding: '20px 40px 20px',
  scrollbarWidth: 'thin'
});

export const SegmentsDrillDown = memo(SegmentsDrillDownComponent);
