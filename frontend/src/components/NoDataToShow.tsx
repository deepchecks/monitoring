import React from 'react';

import { Box, styled, Typography, BoxProps } from '@mui/material';

import { NoDataToShowIcon } from 'assets/icon/icon';

import { colors } from 'theme/colors';

interface NoDataToShowProps extends BoxProps {
  title: string;
}

export const NoDataToShow = ({ title, ...props }: NoDataToShowProps) => (
  <Box {...props}>
    <NoDataToShowIcon />
    <StyledTypography>{title}</StyledTypography>
  </Box>
);

const StyledTypography = styled(Typography)({
  color: colors.neutral.grey[300],
  fontSize: '26px',
  transform: 'translateY(-50px)',
  textAlign: 'center',
  width: '100%',

  '@media (max-width: 1536px)': {
    fontSize: '20px'
  }
});
