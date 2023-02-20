import React, { ReactNode } from 'react';

import { Select, styled, SelectProps } from '@mui/material';

import { colors } from 'theme/colors';

interface CustomStyledSelectProps extends SelectProps {
  children: ReactNode;
}

export const CustomStyledSelect = ({ children, ...props }: CustomStyledSelectProps) => (
  <StyledSelect {...props}>{children}</StyledSelect>
);

export const StyledSelect = styled(Select)({
  fontWeight: 600,
  minWidth: 150,
  color: colors.neutral.darkText,
  borderRadius: '10px',

  '@media (max-width: 1536px)': {
    fontSize: '13px'
  },

  '& .MuiOutlinedInput-notchedOutline': {
    border: `1px solid ${colors.neutral.grey.light}`
  }
});
