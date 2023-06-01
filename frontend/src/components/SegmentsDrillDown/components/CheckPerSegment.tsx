import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, InteractionItem } from 'chart.js';
import { Bar, getElementAtEvent } from 'react-chartjs-2';

import { Box } from '@mui/material';

import { GraphLayout } from './GraphLayout';

import { TITLE, chartData, chartOptions, barsColorArray } from '../SegmentsDrillDown.helpers';
import { SetStateType } from 'helpers/types';
import { drawActiveBarEffect } from 'helpers/base/diagramLine';
import { CheckGroupBySchema } from 'api/generated';

interface CheckPerSegmentProps {
  segmentData: CheckGroupBySchema[];
  dataSet: Array<number | null>;
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
  const [barsColors, setBarsColors] = useState(barsColorArray(dataSet));

  const setActiveBar = useCallback(
    (element: InteractionItem[]) => {
      if (!element.length) return;

      const { index } = element[0];

      if (dataSet[index] === null) return;

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

    setBarsColors(barsColorArray(dataSet, activeBarIndex));
  }, [activeBarIndex]);

  return (
    <GraphLayout title={TITLE} marginBottom="40px" checkPerSegment>
      <Box sx={{ height: '344px' }}>
        <Bar
          ref={chartRef}
          options={chartOptions(segmentData, dataSet, activeBarIndex, yTitle, xTitle)}
          data={chartData(labels, dataSet, barsColors)}
          onClick={handleBarClick}
          plugins={[drawActiveBarEffect]}
        />
      </Box>
    </GraphLayout>
  );
};
