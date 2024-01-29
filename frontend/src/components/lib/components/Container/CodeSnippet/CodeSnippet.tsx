import React from 'react';

import { Prism } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

export interface CodeSnippetProps {
  code: string;
  width?: string;
  margin?: string;
  maxWidth?: string;
}

export const CodeSnippet = ({ code, maxWidth = '770px', width = '100%', margin = '24px 0 18px' }: CodeSnippetProps) => (
  <Prism
    language="python"
    style={materialDark}
    customStyle={{
      width: width,
      margin: margin,
      maxWidth: maxWidth,
      minWidth: '400px',
      borderRadius: '16px',
      border: `1px solid lightgray`,
      padding: '24px',
      whiteSpace: 'pre-line',
      fontSize: '14px'
    }}
  >
    {code}
  </Prism>
);
