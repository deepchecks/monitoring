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
  <Box width={{ xs: '520px', xl: '650px' }} sx={{padding: '1em 2em'}}>
    {isLoading ? (
      <Loader />
    ) : graphData?.datasets.length ? (
      <DiagramLine data={graphData} height={{ lg: 350, xl: 440 }} timeFreq={timeFreq} />
    ) : (
      <>
        <NoDataToShow />
      </>
    )}
  </Box>
);
