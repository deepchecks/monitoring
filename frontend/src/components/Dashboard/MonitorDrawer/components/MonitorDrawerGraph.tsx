import React from 'react';
import { ChartData } from 'chart.js';

import { Box } from '@mui/material';

import { Loader } from 'components/Loader';
import DiagramLine from 'components/DiagramLine/DiagramLine';
import { NoDataToShow } from 'components/NoDataToShow';

import { GraphData } from 'helpers/types';

interface MonitorDrawerGraphViewGraphProps {
  graphData: ChartData<'line', GraphData> | null;
  isLoading: boolean;
  timeFreq?: number;
}

export const MonitorDrawerGraph = ({ graphData, isLoading, timeFreq }: MonitorDrawerGraphViewGraphProps) => (
  <Box width={{ xs: '520px', xl: '630px' }} height="350px" marginLeft="25px">
    {isLoading ? (
      <Loader />
    ) : graphData?.datasets.length ? (
      <DiagramLine data={graphData} height={{ lg: 350, xl: 350 }} timeFreq={timeFreq} />
    ) : (
      <NoDataToShow title="No data to show, try altering the filters" />
    )}
  </Box>
);
