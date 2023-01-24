import React from 'react';
import { ChartData } from 'chart.js';

import { Box } from '@mui/material';

import { Loader } from 'components/Loader';
import DiagramLine from 'components/DiagramLine/DiagramLine';

import { NoDataToShow } from 'assets/icon/icon';

import { GraphData } from 'helpers/types';

interface MonitorDrawerGraphViewGraphProps {
  graphData: ChartData<'line', GraphData> | null;
  isLoading: boolean;
  timeFreq?: number;
}

export const MonitorDrawerGraph = ({ graphData, isLoading, timeFreq }: MonitorDrawerGraphViewGraphProps) => (
  <Box width={{ xs: 400, xl: 480 }}>
    {isLoading ? (
      <Loader />
    ) : graphData?.datasets.length ? (
      <DiagramLine data={graphData} height={{ lg: 250, xl: 340 }} timeFreq={timeFreq} />
    ) : (
      <>
        <NoDataToShow />
      </>
    )}
  </Box>
);
