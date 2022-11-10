import React from 'react';

import { Box, ButtonProps } from '@mui/material';

import { StyledResetSelectionButton } from '../AnalysisItemSelect.style';

interface ResetSelectionButtonProps extends ButtonProps {
  isAnythingSelected: number;
}

const ResetSelectionButton = ({ isAnythingSelected, onClick }: ResetSelectionButtonProps) =>
  isAnythingSelected ? (
    <StyledResetSelectionButton onClick={onClick} variant="text" size="small">
      Reset Selection
    </StyledResetSelectionButton>
  ) : (
    <Box sx={{ height: 30 }} />
  );

export default ResetSelectionButton;
