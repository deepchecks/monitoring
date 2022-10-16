import { Chip, ChipProps, styled } from '@mui/material';
import React from 'react';

const StyledChip = styled(Chip)(({ theme }) => ({
  background: theme.palette.text.disabled,
  '.MuiChip-label': {
    paddingRight: '6px'
  },
  '.MuiSvgIcon-root': {
    marginRight: '4px'
  }
}));

export function ColumnChip(props: ChipProps) {
  return <StyledChip {...props} />;
}
