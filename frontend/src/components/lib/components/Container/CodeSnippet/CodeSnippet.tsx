import React from 'react';

import { Box, BoxProps, Typography, useTheme } from '@mui/material';

export interface CodeSnippetProps extends BoxProps {
  code: string;
}

export const CodeSnippet = ({ code }: CodeSnippetProps) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: '100%',
        borderRadius: '16px',
        border: `1px solid ${theme.palette.grey[400]}`,
        background: theme.palette.grey[200],
        padding: '24px',
        margin: '24px 0 18px',
        whiteSpace: 'pre-line'
      }}
    >
      <Typography variant="body1">{code}</Typography>
    </Box>
  );
};
