import React from 'react';

import { Button } from '@mui/material';

import { Sort } from '../../../assets/icon/icon';

interface FiltersSortButtonProps {
  label?: string;
  isLoading: boolean;
  handleOpenSortMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const FiltersSortButton = ({ handleOpenSortMenu, isLoading, label = 'Sort' }: FiltersSortButtonProps) => (
  <Button variant="text" startIcon={<Sort />} onClick={handleOpenSortMenu} disabled={isLoading} sx={{ minHeight: 30 }}>
    {label}
  </Button>
);

export default FiltersSortButton;
