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
  isCreateAlert?: boolean;
}

const { reset, title } = constants.monitorDrawer.graph;

export const MonitorDialogGraph = ({
  graphData,
  isLoading,
  timeFreq,
  monitor,
  setReset,
  isCreateAlert
}: MonitorDialogGraphViewGraphProps) =>
  isLoading ? (
    <Loader />
  ) : graphData?.datasets.length ? (
    <DiagramLine
      data={graphData}
      height={{ lg: 246, xl: 246 }}
      timeFreq={timeFreq}
      {...(isCreateAlert && { alert_rules: monitor?.alert_rules })}
    />
  ) : (
    <Box>
      <NoDataToShow title={title} height={246} />
      {monitor && setReset && <StyledReset onClick={() => setReset(true)}>{reset}</StyledReset>}
    </Box>
  );

const StyledReset = styled(Typography)(({ theme }) => ({
  fontSize: '18px',
  fontWeight: 600,
  textAlign: 'center',
  color: theme.palette.primary.main,
  transition: 'opacity ease 0.3s',
  cursor: 'pointer',

  '&:hover': { opacity: 0.5 }
}));
