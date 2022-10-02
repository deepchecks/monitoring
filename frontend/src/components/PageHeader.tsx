import { Box, Typography } from '@mui/material';
import React from 'react';

interface PageHeaderProps {
  text: string;
}

export function PageHeader({ text }: PageHeaderProps) {
  return (
    <Box sx={{ padding: '24px 0', borderBottom: theme => `1px dotted ${theme.palette.text.disabled}` }}>
      <Typography variant="h4" sx={{ color: theme => theme.palette.text.disabled }}>
        {text}
      </Typography>
    </Box>
  );
}
