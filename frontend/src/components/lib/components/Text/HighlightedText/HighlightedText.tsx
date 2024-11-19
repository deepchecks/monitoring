import React from 'react';

import { TypographyProps, Typography } from '@mui/material';

import { Text, TextTypes } from '../Text';

interface HighlightedTextProps extends TypographyProps {
  beforeHighlightedText?: string;
  highlightedText: string;
  afterHighlightedText?: string;
  type?: TextTypes;
  highlightedTextType?: TextTypes;
  highlightedTextBold?: boolean;
  onHighlightedTextClick?: (e: React.SyntheticEvent) => void;
}

const sharedStyles = {
  whiteSpace: 'pre-wrap'
};

export const HighlightedText = ({
  beforeHighlightedText = '',
  highlightedText,
  onHighlightedTextClick,
  afterHighlightedText = '',
  type,
  highlightedTextType,
  highlightedTextBold,
  color,
  ...otherProps
}: HighlightedTextProps) => {
  const isOnclick = !!onHighlightedTextClick;

  return (
    <Typography {...otherProps}>
      <Text component="span" text={beforeHighlightedText} type={type} sx={sharedStyles} color={color} />
      <Text
        component="span"
        text={highlightedText}
        type={highlightedTextType || type}
        onClick={onHighlightedTextClick}
        sx={theme => ({
          fontWeight: highlightedTextBold ? 700 : 500,
          color: theme.palette.primary.main,
          cursor: isOnclick ? 'pointer' : 'text',
          transition: 'opacity 0.3s',
          ...sharedStyles,

          '&:hover': {
            opacity: isOnclick ? 0.7 : 1
          },

          '&:active': {
            opacity: isOnclick ? 0.5 : 1
          }
        })}
      />
      <Text component="span" text={afterHighlightedText} type={type} sx={sharedStyles} color={color} />
    </Typography>
  );
};
