import { Box, Typography } from '@mui/material';
import React from 'react';

interface PageHeaderProps {
  text: string;
}

export function PageHeader({ text }: PageHeaderProps) {
  return (
    <Box sx={{ padding: '21px 0', borderBottom: theme => `1px dashed ${theme.palette.text.disabled}` }}>
      <Typography variant="h3">{text}</Typography>
    </Box>
  );
}
