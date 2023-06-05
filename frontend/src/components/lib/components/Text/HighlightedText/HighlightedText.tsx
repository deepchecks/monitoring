import React from 'react';

import { Stack, StackProps } from '@mui/material';

import { Text, TextTypes } from '../Text';

interface HighlightedTextProps extends StackProps {
  beforeHighlightedText?: string;
  highlightedText: string;
  afterHighlightedText?: string;
  type?: TextTypes;
  highlightedTextType?: TextTypes;
  onHighlightedTextClick?: () => void | Promise<void>;
}

const sharedStyles = {
  whiteSpace: 'pre'
};

export const HighlightedText = ({
  beforeHighlightedText = '',
  highlightedText,
  onHighlightedTextClick,
  afterHighlightedText = '',
  type,
  highlightedTextType,
  ...otherProps
}: HighlightedTextProps) => {
  const isOnclick = !!onHighlightedTextClick;

  return (
    <Stack direction="row" {...otherProps}>
      <Text text={beforeHighlightedText} type={type} sx={sharedStyles} />
      <Text
        text={highlightedText}
        type={highlightedTextType || type}
        onClick={onHighlightedTextClick}
        sx={theme => ({
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
      <Text text={afterHighlightedText} type={type} sx={sharedStyles} />
    </Stack>
  );
};
