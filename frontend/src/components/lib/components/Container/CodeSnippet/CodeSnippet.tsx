import React from 'react';

import { BoxProps, useTheme } from '@mui/material';

import { Prism } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { isLargeDesktop } from 'components/lib/theme/typography';

export interface CodeSnippetProps extends BoxProps {
  code: string;
  maxWidth?: string;
}

export const CodeSnippet = ({ code, maxWidth = '770px' }: CodeSnippetProps) => {
  const theme = useTheme();
  // const handleCopy = () => navigator.clipboard.writeText(code);

  return (
    <Prism
      language="python"
      style={materialDark}
      customStyle={{
        width: '100%',
        maxWidth: maxWidth,
        borderRadius: '16px',
        border: `1px solid ${theme.palette.grey[400]}`,
        padding: '24px',
        margin: '24px 0 18px',
        whiteSpace: 'pre-line',
        fontSize: isLargeDesktop ? '14px' : '12px'
      }}
    >
      {code}
    </Prism>
  );
};
