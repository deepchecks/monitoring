import React from 'react';

import { Box, IconButtonProps } from '@mui/material';

import { CloseIcon } from 'assets/icon/icon';

import { StyledRoundedSelectCloseButton } from '../AnalysisItemSelect.style';

interface ClearButtonProps extends IconButtonProps {
  isActive: number | string;
}

const ClearButton = ({ isActive, onClick }: ClearButtonProps) =>
  (typeof isActive === 'number' && isActive > 0) || (typeof isActive === 'string' && isActive !== '') ? (
    <StyledRoundedSelectCloseButton onClick={onClick}>
      <CloseIcon />
    </StyledRoundedSelectCloseButton>
  ) : (
    <Box width="23px" />
  );

export default ClearButton;
