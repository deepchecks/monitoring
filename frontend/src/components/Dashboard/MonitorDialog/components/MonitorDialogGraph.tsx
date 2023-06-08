import React from 'react';
import { ChartData } from 'chart.js';

import { MonitorSchema } from 'api/generated';

import { Box, Typography, styled } from '@mui/material';

import { Loader } from 'components/base/Loader/Loader';
import DiagramLine from 'components/DiagramLine/DiagramLine';
import { NoDataToShow } from 'components/DiagramLine/NoData/NoDataToShow';

import { GraphData } from 'helpers/types';
import { constants } from '../../dashboard.constants';

interface MonitorDialogGraphViewGraphProps {
  graphData: ChartData<'line', GraphData> | null;
  isLoading: boolean;
  timeFreq?: number;
  monitor?: MonitorSchema | null;
  setReset?: React.Dispatch<React.SetStateAction<boolean>>;
}

const { reset, title } = constants.monitorDrawer.graph;

export const MonitorDialogGraph = ({
  graphData,
  isLoading,
  timeFreq,
  monitor,
  setReset
}: MonitorDialogGraphViewGraphProps) =>
  isLoading ? (
    <Loader />
  ) : graphData?.datasets.length ? (
    <DiagramLine data={graphData} height={{ lg: 173, xl: 173 }} timeFreq={timeFreq} />
  ) : (
    <Box>
      <NoDataToShow title={title} height={193} />
      {monitor && setReset && <StyledReset onClick={() => setReset(true)}>{reset}</StyledReset>}
    </Box>
  );

const StyledReset = styled(Typography)(({ theme }) => ({
  fontSize: '18px',
  fontWeight: 600,
  textAlign: 'center',
  color: theme.palette.primary.main,
  transition: 'opacity ease 0.3s',
  transform: 'translateY(-18px)',
  cursor: 'pointer',

  '&:hover': { opacity: 0.5 }
}));
