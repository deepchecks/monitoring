import React from 'react';
import { Skeleton } from '@mui/material';
import styled from 'styled-components';

interface Props {
  width?: string | number;
  height?: string | number;
  widthL?: string;
  children?: any;
  margin?: string;
  borderRadius?: string | number;
  minWidth?: string;
  minHeight?: string;
  lh?: number;
  marginL?: string;
  borderRadiusL?: string | number;
  minWidthL?: string;
  minHeightL?: string;
  lhL?: number;
  isMobile?: boolean;
}

const StyledSkeleton = styled(Skeleton)<Props>`
  && {
    margin: ${p => p.margin || ''};
    border-radius: ${p => p.borderRadius || ''};
    min-width: ${p => p.minWidth || ''};
    min-height: ${p => p.minHeight || ''};
    line-height: ${p => p.lh ?? 1};
  }
`;

export const TextSkeleton = (props: Props) => <StyledSkeleton animation={'wave'} variant={'text'} {...props} />;

export const CircSkeleton = (props: Props) => <StyledSkeleton animation={'wave'} variant={'circular'} {...props} />;

export const RectSkeleton = (props: Props) => <StyledSkeleton animation={'wave'} variant={'rectangular'} {...props} />;
