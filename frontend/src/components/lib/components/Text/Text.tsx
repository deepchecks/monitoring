import React from 'react';
import { Typography, TypographyProps } from '@mui/material';

export interface TextProps extends TypographyProps {
  text: string;
}

export const Text = (props: TextProps) => {
  const { text, whiteSpace = 'pre-line', overflow = 'hidden', textOverflow = 'ellipsis' } = props;

  return (
    <Typography overflow={overflow} whiteSpace={whiteSpace} textOverflow={textOverflow} {...props}>
      {text}
    </Typography>
  );
};
