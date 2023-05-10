import React from 'react';

import { Box, BoxProps, Typography, useTheme } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

export interface CodeSnippetProps extends BoxProps {
  code: string;
  copyBtn?: boolean;
}

export const CodeSnippet = ({ code, copyBtn }: CodeSnippetProps) => {
  const theme = useTheme();

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
  };

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
      {copyBtn && (
        <ContentCopyIcon
          sx={{ cursor: 'pointer', float: 'right', width: '24px', height: '24px', color: theme.palette.grey[500] }}
          onClick={handleCopy}
        />
      )}
      <Typography variant="body1">{code}</Typography>
    </Box>
  );
};
