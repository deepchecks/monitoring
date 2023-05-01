import React from 'react';

import { IconButtonProps } from '@mui/material';

import { CloseIcon } from 'assets/icon/icon';

import { StyledRoundedSelectCloseButton } from '../AnalysisItemSelect.style';

interface ClearButtonProps extends IconButtonProps {
  inputCheck: number | string;
}

const ClearButton = ({ inputCheck, onClick }: ClearButtonProps) => {
  const isActive =
    (typeof inputCheck === 'number' && inputCheck > 0) || (typeof inputCheck === 'string' && inputCheck !== '');

  return (
    <StyledRoundedSelectCloseButton onClick={onClick} sx={{ display: isActive ? 'flex' : 'none' }}>
      <CloseIcon />
    </StyledRoundedSelectCloseButton>
  );
};

export default ClearButton;
