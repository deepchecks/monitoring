import React, { useRef, useEffect, useCallback } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, InteractionItem } from 'chart.js';
import { Bar, getElementAtEvent } from 'react-chartjs-2';

import { Box } from '@mui/material';

import { GraphLayout } from './GraphLayout';

import { TITLE, ACTIVE_BAR_COLOR, chartData, chartOptions, barsColorArray } from '../SegmentsDrillDown.helpers';
import { SetStateType } from 'helpers/types';


interface CheckPerSegmentProps {
  dataSet: number[];
  labels: string[];
  setActiveBarName: SetStateType<string>;
  activeBarIndex: number;
  setActiveBarIndex: SetStateType<number>;
  yTitle: string;
  xTitle?: string;
}

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export const CheckPerSegment = ({
  dataSet,
  labels,
  setActiveBarName,
  activeBarIndex,
  setActiveBarIndex,
  yTitle,
  xTitle
}: CheckPerSegmentProps) => {
  const chartRef = useRef<ChartJS<'bar'>>();

  const setActiveBar = useCallback(
    (element: InteractionItem[]) => {
      if (!element.length) return;

      const { index } = element[0];

      setActiveBarName(labels[index]);
      setActiveBarIndex(index);
    },
    [labels, setActiveBarName, setActiveBarIndex]
  );

  const handleBarClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
      const { current: chart } = chartRef;

      if (!chart) return;

      setActiveBar(getElementAtEvent(chart, event));
    },
    [setActiveBar]
  );

  useEffect(() => {
    const { current: chart } = chartRef;

    if (!chart) return;

    chart.data.datasets[0].backgroundColor = [
      ...barsColorArray(activeBarIndex),
      ACTIVE_BAR_COLOR,
      ...barsColorArray(dataSet.length - activeBarIndex)
    ];
    chart.update();
  }, [activeBarIndex, dataSet]);

  return (
    <GraphLayout title={TITLE} marginBottom="40px" checkPerSegment>
      <Box sx={{ height: '344px' }}>
        <Bar
          ref={chartRef}
          options={chartOptions(dataSet, yTitle, xTitle)}
          data={chartData(labels, dataSet)}
          onClick={handleBarClick}
        />
      </Box>
    </GraphLayout>
  );
};
