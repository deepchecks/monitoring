import React, { ReactNode } from 'react';

import { Typography, TypographyProps } from '@mui/material';
import { Variant } from '@mui/material/styles/createTypography';

export type TextTypes = 'h1' | 'h2' | 'h3' | 'button' | 'small' | 'body' | 'bodyBold' | 'tiny' | 'tinyBold';

export interface TextProps extends Omit<TypographyProps, 'variant'> {
  text: ReactNode;
  type?: TextTypes;
  component?: React.ElementType;
}

function getTextType(type: TextTypes | undefined): Variant {
  switch (type) {
    case 'h1':
      return 'h1';

    case 'h2':
      return 'h2';

    case 'h3':
      return 'h3';

    case 'button':
      return 'button';

    case 'small':
      return 'h5';

    case 'body':
      return 'body1';

    case 'bodyBold':
      return 'body2';

    case 'tiny':
      return 'subtitle1';

    case 'tinyBold':
      return 'subtitle2';

    default:
      return 'body1';
  }
}

export const Text = (props: TextProps) => {
  const {
    text,
    type,
    whiteSpace = 'pre-line',
    overflow = 'hidden',
    textOverflow = 'ellipsis',
    component = 'p',
    ...otherProps
  } = props;

  return (
    <Typography
      variant={getTextType(type)}
      overflow={overflow}
      whiteSpace={whiteSpace}
      textOverflow={textOverflow}
      component={component}
      {...otherProps}
    >
      {text}
    </Typography>
  );
};
