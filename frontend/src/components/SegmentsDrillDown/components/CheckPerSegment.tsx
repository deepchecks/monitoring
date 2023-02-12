import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, InteractionItem } from 'chart.js';
import { Bar, getElementAtEvent } from 'react-chartjs-2';

import { Box } from '@mui/material';

import { GraphLayout } from './GraphLayout';

import { TITLE, ACTIVE_BAR_COLOR, chartData, chartOptions, barsColorArray } from '../SegmentsDrillDown.helpers';
import { SetStateType } from 'helpers/types';
import { drawActiveBarEffect } from 'helpers/diagramLine';
import { CheckGroupBySchema } from 'api/generated';

interface CheckPerSegmentProps {
  segmentData: CheckGroupBySchema[];
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
  segmentData,
  dataSet,
  labels,
  setActiveBarName,
  activeBarIndex,
  setActiveBarIndex,
  yTitle,
  xTitle
}: CheckPerSegmentProps) => {
  const chartRef = useRef<ChartJS<'bar'>>();
  const [barsColors, setBarsColors] = useState(barsColorArray(dataSet.length));

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

    setBarsColors([
      ...barsColorArray(activeBarIndex),
      ACTIVE_BAR_COLOR,
      ...barsColorArray(dataSet.length - activeBarIndex - 1)
    ]);
  }, [activeBarIndex, dataSet]);

  return (
    <GraphLayout title={TITLE} marginBottom="40px" checkPerSegment>
      <Box sx={{ height: '344px' }}>
        <Bar
          ref={chartRef}
          options={chartOptions(segmentData, dataSet, yTitle, xTitle, activeBarIndex)}
          data={chartData(labels, dataSet, barsColors)}
          onClick={handleBarClick}
          plugins={[drawActiveBarEffect]}
        />
      </Box>
    </GraphLayout>
  );
};
