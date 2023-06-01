import React from 'react';

import { Prism } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

import { isLargeDesktop } from '../../../theme/typography';

export interface CodeSnippetProps {
  code: string;
  maxWidth?: string;
}

export const CodeSnippet = ({ code, maxWidth = '770px' }: CodeSnippetProps) => (
  <Prism
    language="python"
    style={materialDark}
    customStyle={{
      width: '100%',
      maxWidth: maxWidth,
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
