import React from 'react';

import { Stack, StackProps, useTheme } from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';

import { StyledText } from '../../..';

type ThumbColor = 'green' | 'red' | 'grey';

interface ThumbsProps extends StackProps {
  outlined?: boolean;
  label?: string;
  thumbDirection?: 'up' | 'down';
  color?: ThumbColor;
}

export const Thumbs = ({
  outlined = false,
  label,
  thumbDirection = 'up',
  color = 'grey',
  ...otherProps
}: ThumbsProps) => {
  const { palette } = useTheme();

  const getThumbColor = (color: ThumbColor) => {
    switch (color) {
      case 'green':
        return palette.success.main;
      case 'red':
        return palette.error.main;
      case 'grey':
        return palette.grey[400];
      default:
        return palette.grey[400];
    }
  };

  return (
    <Stack gap="5px" alignItems="center" justifyContent="center" {...otherProps}>
      {thumbDirection === 'up' ? (
        outlined ? (
          <ThumbUpOutlinedIcon sx={{ color: getThumbColor(color) }} />
        ) : (
          <ThumbUpIcon sx={{ color: getThumbColor(color) }} />
        )
      ) : outlined ? (
        <ThumbDownOutlinedIcon sx={{ color: getThumbColor(color) }} />
      ) : (
        <ThumbDownIcon sx={{ color: getThumbColor(color) }} />
      )}
      {label && <StyledText text={label} />}
    </Stack>
  );
};
