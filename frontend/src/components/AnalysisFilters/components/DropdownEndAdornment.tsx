import React from 'react';

import { styled, Typography, InputAdornment } from '@mui/material';

import { DropdownArrowComponent } from 'components/DropdownArrowComponent';

import { theme } from 'components/lib/theme';

interface DropdownEndAdornmentProps {
  filtersLength: number;
  isDropdownOpen: boolean;
}

export const DropdownEndAdornment = ({ filtersLength, isDropdownOpen }: DropdownEndAdornmentProps) => (
  <InputAdornment position="end">
    {!!filtersLength && <StyledFiltersCount>({filtersLength})</StyledFiltersCount>}
    <DropdownArrowComponent isDropdownOpen={isDropdownOpen} />
  </InputAdornment>
);

const StyledFiltersCount = styled(Typography)({
  color: theme.palette.primary.main
});
