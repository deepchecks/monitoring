import React from 'react';

import { Chip, ChipProps, styled } from '@mui/material';

import { colors } from 'theme/colors';

export const ColumnChip = (props: ChipProps) => <StyledChip {...props} />;

const StyledChip = styled(Chip)({
  fontSize: '14px',
  color: colors.neutral.darkText,
  background: colors.neutral.grey.light,
  height: '36px',
  padding: '8px 14px 8px 16px',
  borderRadius: '10px',

  '.MuiChip-label': {
    fontWeight: 600,
    padding: '0 6px 0 0'
  },

  '.MuiChip-deleteIcon': {
    color: colors.neutral.blue[100],

    '&:hover': {
      color: colors.neutral.blue[100],
      opacity: 0.5
    }
  },

  '.MuiSvgIcon-root': {
    margin: 0
  }
});
