import React from 'react';

import { Prism } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

import { isLargeDesktop } from '../../../theme/typography';

export interface CodeSnippetProps {
  code: string;
  maxWidth?: string;
  width?: string;
}

export const CodeSnippet = ({ code, maxWidth = '770px', width = '100%' }: CodeSnippetProps) => (
  <Prism
    language="python"
    style={materialDark}
    customStyle={{
      width: width,
      maxWidth: maxWidth,
      minWidth: '400px',
      borderRadius: '16px',
      border: `1px solid lightgray`,
      padding: '24px',
      margin: '24px 0 18px',
      whiteSpace: 'pre-line',
      fontSize: isLargeDesktop ? '14px' : '12px'
    }}
  >
    {code}
  </Prism>
);
