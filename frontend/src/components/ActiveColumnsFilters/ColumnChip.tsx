import React from 'react';

import { Chip, ChipProps, styled } from '@mui/material';

import { theme } from 'components/lib/theme';

export const ColumnChip = (props: ChipProps) => <StyledChip {...props} />;

const StyledChip = styled(Chip)({
  fontSize: '14px',
  color: theme.palette.text.primary,
  background: theme.palette.grey.light,
  height: '36px',
  padding: '8px 14px 8px 16px',
  borderRadius: '10px',

  '.MuiChip-label': {
    fontWeight: 600,
    padding: '0 6px 0 0'
  },

  '.MuiChip-deleteIcon': {
    color: theme.palette.info.main,

    '&:hover': {
      color: theme.palette.info.main,
      opacity: 0.5
    }
  },

  '.MuiSvgIcon-root': {
    margin: 0
  }
});
