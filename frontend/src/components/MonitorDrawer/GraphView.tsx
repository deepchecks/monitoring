import { Box, Button, Stack, Typography } from '@mui/material';
import { ChartData } from 'chart.js';
import { Loader } from 'components/Loader';
import { GraphData } from 'helpers/types';
import React, { Dispatch, SetStateAction } from 'react';
import { CloseIcon, NoDataToShow } from '../../assets/icon/icon';
import DiagramLine from '../DiagramLine';

interface GraphViewProps {
  onClose: () => void | undefined;
  graphData?: ChartData<'line'>;
  isLoading: boolean;
  setResetMonitor: Dispatch<SetStateAction<boolean>>;
}

export const GraphView = ({ onClose, graphData, isLoading, setResetMonitor }: GraphViewProps) => {
  const closeDrawer = () => {
    onClose();
  };

  const resetFilters = () => {
    setResetMonitor(true);
  };

  return (
    <Box
      sx={theme => ({
        padding: '10px',
        backgroundColor: theme.palette.grey[50]
      })}
    >
      <Stack direction="row" justifyContent="end">
        <Button variant="text" size="large" startIcon={<CloseIcon />} onClick={closeDrawer}>
          <Typography variant="body2">Close</Typography>
        </Button>
      </Stack>
      <Box
        sx={{
          padding: '70px',
          width: 690
        }}
      >
        {isLoading ? (
          <Loader />
        ) : graphData?.datasets.length ? (
          <DiagramLine data={graphData as ChartData<'line', GraphData>} />
        ) : (
          <>
            <NoDataToShow />
            <Typography
              variant="body1"
              sx={{ textAlign: 'center', color: theme => theme.palette.primary.main, cursor: 'pointer' }}
              onClick={resetFilters}
            >
              Reset Changes
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
};
