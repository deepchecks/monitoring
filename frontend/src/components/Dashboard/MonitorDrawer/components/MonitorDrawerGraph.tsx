import React from 'react';
import { ChartData } from 'chart.js';

import { MonitorSchema } from 'api/generated';

import { Box, Typography, styled } from '@mui/material';

import { Loader } from 'components/Loader';
import DiagramLine from 'components/DiagramLine/DiagramLine';
import { NoDataToShow } from 'components/NoDataToShow';

import { GraphData } from 'helpers/types';
import { constants } from '../../dashboard.constants';

interface MonitorDrawerGraphViewGraphProps {
  graphData: ChartData<'line', GraphData> | null;
  isLoading: boolean;
  timeFreq?: number;
  monitor?: MonitorSchema | null;
  setReset?: React.Dispatch<React.SetStateAction<boolean>>;
}

const { reset, title } = constants.monitorDrawer.graph;

export const MonitorDrawerGraph = ({
  graphData,
  isLoading,
  timeFreq,
  monitor,
  setReset
}: MonitorDrawerGraphViewGraphProps) =>
  isLoading ? (
    <Loader />
  ) : graphData?.datasets.length ? (
    <DiagramLine data={graphData} height={{ lg: 350, xl: 350 }} timeFreq={timeFreq} />
  ) : (
    <Box sx={{ transform: 'translateX(25px)' }}>
      <NoDataToShow title={title} />
      {monitor && setReset && <StyledReset onClick={() => setReset(true)}>{reset}</StyledReset>}
    </Box>
  );

const StyledReset = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main,
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'opacity ease 0.3s',
  transform: 'translateY(-45px)',
  '&:hover': { opacity: 0.5 }
}));
