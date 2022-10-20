import React from 'react';

import { Typography, StackProps } from '@mui/material';

import { StyledModelInfoBadge } from './ModelInfoItem.style';

interface ModelInfoBadgeProps extends StackProps {
  value: number | undefined;
  title: string;
}

const ModelInfoBadge = ({ value, title, ...props }: ModelInfoBadgeProps) => (
  <StyledModelInfoBadge {...props}>
    <Typography sx={{ fontSize: '18px', fontWeight: 700, lineHeight: '25.2px' }}>{value || 0}</Typography>
    <Typography sx={{ fontSize: '10px', lineHeight: '14px' }}>{title}</Typography>
  </StyledModelInfoBadge>
);

export default ModelInfoBadge;
