import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, InteractionItem } from 'chart.js';
import { Bar, getElementAtEvent } from 'react-chartjs-2';

import { CheckGroupBySchema } from 'api/generated';

import { Box } from '@mui/material';

import { GraphLayout } from './components/GraphLayout';
import { SegmentTests } from './components/SegmentTests';
import { NoGraphDataToShow } from './components/NoGraphDataToShow';

import { TITLE, chartData, chartOptions, filledBarColorsArray, ACTIVE_BAR_COLOR } from './DataGraphs.helpers';

interface DataGraphsProps {
  checkName: string;
  datasetName: string;
  data: CheckGroupBySchema[] | null;
}

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export const DataGraphs = ({ data, datasetName, checkName }: DataGraphsProps) => {
  const chartRef = useRef<ChartJS<'bar'>>();

  const labels = useMemo(() => data?.map(d => d.name), [data]) || [];
  const dataSet: number[] | undefined = useMemo(
    () => data?.map(d => (d.value ? d.value[datasetName] : 0)),
    [data, datasetName]
  );
  const isAllDataIsZero = useMemo(() => dataSet?.every(d => d === 0), [dataSet]);

  const [activeBarIndex, setActiveBarIndex] = useState(0);
  const [activeBarName, setActiveBarName] = useState(labels[0]);

  const setActiveBar = (element: InteractionItem[]) => {
    if (!element.length) return;

    const { index } = element[0];

    setActiveBarName(labels[index]);
    setActiveBarIndex(index);
  };

  const handleBarClick = (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    const { current: chart } = chartRef;

    if (!chart) return;

    setActiveBar(getElementAtEvent(chart, event));
  };

  useEffect(() => {
    const { current: chart } = chartRef;

    if (!chart || !dataSet) return;

    chart.data.datasets[0].backgroundColor = [
      ...filledBarColorsArray(activeBarIndex),
      ACTIVE_BAR_COLOR,
      ...filledBarColorsArray(dataSet.length - activeBarIndex)
    ];
    chart.update();
  }, [activeBarIndex, dataSet]);

  return data && labels && dataSet && !isAllDataIsZero ? (
    <>
      <GraphLayout title={TITLE} checkPerSegment>
        <Box sx={{ height: '344px' }}>
          <Bar
            ref={chartRef}
            options={chartOptions(dataSet)}
            data={chartData(labels, dataSet)}
            onClick={handleBarClick}
          />
        </Box>
      </GraphLayout>
      {data[activeBarIndex].display[0] ? (
        <SegmentTests
          activeBarName={activeBarName}
          checkName={checkName}
          plots={data[activeBarIndex].display.map(plot=> JSON.parse(plot as string))}
        />
      ) : (
        <NoGraphDataToShow />
      )}
    </>
  ) : (
    <NoGraphDataToShow />
  );
};
