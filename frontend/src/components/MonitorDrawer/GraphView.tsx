import React from 'react';
import { Button, Stack, Typography, Box } from '@mui/material';
import { CloseIcon, NoDataToShow } from '../../assets/icon/icon';
import DiagramLine from '../DiagramLine';
import { ChartData } from 'chart.js';
import { GraphData } from 'helpers/types';

interface GraphViewProps {
  onClose: () => void | undefined;
  graphData?: ChartData<'line'>;
  isLoading: boolean;
}

export const GraphView = ({ onClose, graphData }: GraphViewProps) => {
  const closeDrawer = () => {
    onClose();
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
        {graphData?.datasets.length ? (
          <DiagramLine data={graphData as ChartData<'line', GraphData>} />
        ) : (
          <NoDataToShow />
        )}
      </Box>
    </Box>
  );
};
