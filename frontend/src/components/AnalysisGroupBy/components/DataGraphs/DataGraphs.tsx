import React, { useMemo, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';

import { CheckGroupBySchema, SingleCheckRunOptions } from 'api/generated';

import { styled, Box } from '@mui/material';

import { SegmentTests } from './components/SegmentTests';
import { NoGraphDataToShow } from './components/NoGraphDataToShow';
import { CheckPerSegment } from './components/CheckPerSegment';
import { RunTestSuite } from './components/RunTestSuite';

interface DataGraphsProps {
  checkName: string | undefined;
  datasetName: string;
  data: CheckGroupBySchema[];
  selectedFeature: string | undefined;
  modelVersionId: number | null;
  singleWindowMonitorOptions: SingleCheckRunOptions | null;
}

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export const DataGraphs = ({
  data,
  datasetName,
  checkName,
  selectedFeature,
  modelVersionId,
  singleWindowMonitorOptions
}: DataGraphsProps) => {
  const dataSet: number[] = useMemo(
    () => (data.length ? data.map(d => (d.value ? d.value[datasetName] : 0)) : []),
    [data, datasetName]
  );
  const labels = useMemo(() => (data.length ? data.map(d => d.name) : []), [data]);
  const allDataIsZeros = useMemo(() => dataSet.every(d => d === 0), [dataSet]);
  const testSuitePropsAreNotNull = !!(selectedFeature && modelVersionId && singleWindowMonitorOptions);

  const [activeBarIndex, setActiveBarIndex] = useState(0);
  const [activeBarName, setActiveBarName] = useState(labels[0]);

  const activeBarFilters = data[activeBarIndex].filters.filters;
  const plots = data[activeBarIndex]?.display as string[];

  return !allDataIsZeros && dataSet.length ? (
    <>
      <StyledContainer>
        <CheckPerSegment
          dataSet={dataSet}
          labels={labels}
          setActiveBarName={setActiveBarName}
          activeBarIndex={activeBarIndex}
          setActiveBarIndex={setActiveBarIndex}
        />
        <SegmentTests activeBarName={activeBarName} checkName={checkName} plots={plots.map(plot => JSON.parse(plot))} />
      </StyledContainer>
      {testSuitePropsAreNotNull && (
        <RunTestSuite
          activeBarFilters={activeBarFilters}
          modelVersionId={modelVersionId}
          singleWindowMonitorOptions={singleWindowMonitorOptions}
        />
      )}
    </>
  ) : (
    <NoGraphDataToShow />
  );
};

const StyledContainer = styled(Box)({
  overflow: 'overlay',
  padding: '20px 40px 20px',
  scrollbarWidth: 'thin'
});
