import React from 'react';

import { Skeleton as MUISkeleton, keyframes, useTheme } from '@mui/material';

export interface SkeletonProps {
  variantType?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
  borderRadius?: string;
  margin?: string;
}

export const Skeleton = (props: SkeletonProps) => {
  const { variantType = 'rounded', width = '100%', height = '100%', borderRadius = '14px', margin = '0' } = props;

  const fade = keyframes`
  0% { opacity: 0; }
  100% { opacity: 1; }
`;

  const { palette } = useTheme();

  return (
    <MUISkeleton
      animation={'wave'}
      variant={variantType}
      sx={{
        width: width,
        height: height,
        margin: margin,
        borderRadius: borderRadius,
        bgcolor: palette.grey[200],
        animation: `${fade} 0.8s ease`
      }}
    />
  );
};
