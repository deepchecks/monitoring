import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

import { Box, BoxProps } from '@mui/material';

import { StyledScoreContainer, StyledTitle, StyledValue } from './DoughnutChart.styles';
import { getData, options } from './DoughnutChart.helpers';

ChartJS.register(ArcElement, Tooltip);

interface DoughnutChartProps extends BoxProps {
  data: number[];
  score?: number;
}

export const DoughnutChart = ({ data, score, width = 200, ...otherProps }: DoughnutChartProps) => {
  return (
    <Box position="relative" width={width} {...otherProps}>
      <Doughnut data={getData(data)} options={options} />
      {score && (
        <StyledScoreContainer>
          <StyledTitle>Score</StyledTitle>
          <StyledValue>{score + '%'}</StyledValue>
        </StyledScoreContainer>
      )}
    </Box>
  );
};
