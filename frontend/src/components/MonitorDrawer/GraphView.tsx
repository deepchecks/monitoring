import React from 'react';
import { Button, Stack, Typography, Box } from '@mui/material';
import { CloseIcon } from '../../assets/icon/icon';
import DiagramLine from '../DiagramLine';
// import { useTypedSelector } from '../../../../store/hooks';
// import { checkGraphSelector } from '../../../../store/slices/check/checkSlice';

interface GraphViewProps {
  onClose: () => void | undefined;
}

export const GraphView = ({ onClose }: GraphViewProps) => {
  // const graph = useTypedSelector(checkGraphSelector);
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
        <DiagramLine data={{ datasets: [] }} />
      </Box>
    </Box>
  );
};
