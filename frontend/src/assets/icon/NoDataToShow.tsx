import React, { FC } from 'react';
import { ReactComponent as NoDataToShowIcon } from './noDataToShow.svg';
import { Box, styled, Typography } from '@mui/material';

interface NoDataToShowProps {
  text: string;
  width: number | string;
  height: number | string;
}

export const NoDataToShow: FC<NoDataToShowProps> = ({ text, height, width }) => {
  return (
    <Box sx={{ width, height, margin: '0 auto', position: 'relative' }}>
      <NoDataToShowIcon />
      <StyledTypography>{text}</StyledTypography>
    </Box>
  );
};

const StyledTypography = styled(Typography)({
  color: '#B3BEC4',
  fontSize: '26px',
  position: 'absolute',
  bottom: '10%',
  left: '50%',
  transform: 'translateX(-50%)',
  textAlign: 'center',
  width: '100%'
});
