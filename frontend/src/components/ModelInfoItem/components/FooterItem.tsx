import React from 'react';

import { Typography, StackProps } from '@mui/material';

import { StyledFooterItem } from '../ModelInfoItem.style';

interface FooterItemProps extends StackProps {
  value: number | undefined;
  title: string;
}

export const FooterItem = ({ value, title, ...props }: FooterItemProps) => (
  <StyledFooterItem {...props}>
    <Typography sx={{ fontSize: '14px', fontWeight: 600, lineHeight: '16.94px' }}>{value || 0}</Typography>
    <Typography sx={{ fontSize: '12px', fontWeight: 400, lineHeight: '14.52px' }}>{title}</Typography>
  </StyledFooterItem>
);
