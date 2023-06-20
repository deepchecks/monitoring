import React from 'react';

import { styled, Typography, Box, BoxProps } from '@mui/material';

interface AnalysisDrillDownInfoItemProps extends BoxProps {
  title: string;
  value: string;
}

export const AnalysisDrillDownInfoItem = ({ title, value, ...props }: AnalysisDrillDownInfoItemProps) => (
  <Box {...props}>
    <StyledItemName>{title}</StyledItemName>
    <StyledItemValue>{value}</StyledItemValue>
  </Box>
);

const StyledItemName = styled(Typography)({
  fontSize: '12px',
  marginBottom: '4px'
});

const StyledItemValue = styled(Typography)({
  fontWeight: 600,
  fontSize: '14px',
  lineHeight: '175%'
});
