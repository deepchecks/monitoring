import React from 'react';

import { Skeleton as MUISkeleton } from '@mui/material';

export interface SkeletonProps {
  variantType?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
  borderRadius?: string;
  margin?: string;
}

export const Skeleton = (props: SkeletonProps) => {
  const { variantType = 'rounded', width = '100%', height = '100%', borderRadius = '14px', margin = '0' } = props;

  return (
    <MUISkeleton
      animation={'wave'}
      variant={variantType}
      sx={{
        width: width,
        height: height,
        borderRadius: borderRadius,
        margin: margin
      }}
    />
  );
};
