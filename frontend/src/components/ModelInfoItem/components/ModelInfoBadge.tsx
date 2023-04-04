import React from 'react';

import { Typography, StackProps } from '@mui/material';

import { StyledModelInfoBadge } from '../ModelInfoItem.style';

interface ModelInfoBadgeProps extends StackProps {
  value: number | undefined;
  title: string;
}

export const ModelInfoBadge = ({ value, title, ...props }: ModelInfoBadgeProps) => (
  <StyledModelInfoBadge {...props}>
    <Typography sx={{ fontSize: '24px', fontWeight: 700, lineHeight: '140%' }}>{value || 0}</Typography>
    <Typography sx={{ fontSize: '12px', lineHeight: '140%' }}>{title}</Typography>
  </StyledModelInfoBadge>
);
