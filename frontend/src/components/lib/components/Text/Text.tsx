import React, { ReactNode } from 'react';
import { Typography, TypographyProps } from '@mui/material';
import { Variant } from '@mui/material/styles/createTypography';

export type TextTypes =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bodyNormal'
  | 'bodyBold'
  | 'smallNormal'
  | 'smallBold'
  | 'smallBoldFontSecondary'
  | 'tiny'
  | 'button';

export interface TextProps extends Omit<TypographyProps, 'variant'> {
  text: ReactNode;
  type?: TextTypes;
}

function getTextType(type: TextTypes | undefined): Variant {
  switch (type) {
    case 'h1':
      return 'h1';

    case 'h2':
      return 'h2';

    case 'h3':
      return 'h3';

    case 'bodyNormal':
      return 'body1';

    case 'bodyBold':
      return 'body2';

    case 'smallNormal':
      return 'h5';

    case 'smallBold':
      return 'subtitle1';

    case 'smallBoldFontSecondary':
      return 'subtitle2';

    case 'tiny':
      return 'h6';

    case 'button':
      return 'button';

    default:
      return 'body1';
  }
}

export const Text = (props: TextProps) => {
  const { text, type, whiteSpace = 'pre-line', overflow = 'hidden', textOverflow = 'ellipsis' } = props;

  return (
    <Typography
      variant={getTextType(type)}
      overflow={overflow}
      whiteSpace={whiteSpace}
      textOverflow={textOverflow}
      {...props}
    >
      {text}
    </Typography>
  );
};
