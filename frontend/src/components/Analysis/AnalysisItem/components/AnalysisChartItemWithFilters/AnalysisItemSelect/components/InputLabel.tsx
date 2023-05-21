import React from 'react';

import { Typography } from '@mui/material';

import { StyledRoundedSelectInputLabel } from '../AnalysisItemSelect.style';
import { SelectSize } from '../AnalysisItemSelect.types';

interface InputLabelProps {
  id: string;
  label: string;
  size: SelectSize;
}

const sizeMap = {
  small: 'small',
  medium: 'normal'
} as const;

const InputLabel = ({ id, label, size }: InputLabelProps) => (
  <StyledRoundedSelectInputLabel id={id} htmlFor={label} size={size ? sizeMap[size] : sizeMap.medium}>
    <Typography variant="subtitle2" sx={{ lineHeight: '17px', color: 'inherit' }}>
      {label}
    </Typography>
  </StyledRoundedSelectInputLabel>
);

export default InputLabel;
