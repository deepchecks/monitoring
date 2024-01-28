import React from 'react';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import annotationPlugin from 'chartjs-plugin-annotation';

import { Box, BoxProps } from '@mui/material';

import { StyledTitleText } from './DistributionChart.styles';
import { getData, getOptions } from './DistributionChart.helpers';

ChartJS?.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  annotationPlugin
);

interface DistributionChartProps extends BoxProps {
  data: number[];
  labels: number[];
  title: string;
  condition: number;
  average: number;
}

export const DistributionChart = ({
  data,
  labels,
  title,
  average,
  condition,
  width = 560,
  ...otherProps
}: DistributionChartProps) => (
  <Box width={width} key={title} {...otherProps}>
    <StyledTitleText text={title} type="body" />
    <Line options={getOptions(average, condition)} data={getData(data, labels)} />
  </Box>
);
