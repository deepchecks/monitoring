import React from 'react';

import { Chip, ChipProps, styled } from '@mui/material';

import { colors } from 'theme/colors';

export function ColumnChip(props: ChipProps) {
  return <StyledChip {...props} />;
}

const StyledChip = styled(Chip)({
  color: colors.neutral.blue[100],
  background: colors.neutral.grey[150],

  '.MuiChip-label': {
    paddingRight: '6px'
  },

  '.MuiChip-deleteIcon': {
    color: colors.neutral.blue[100],

    '&:hover': {
      color: colors.neutral.blue[100],
      opacity: 0.5
    }
  },

  '.MuiSvgIcon-root': {
    marginRight: '4px'
  }
});
