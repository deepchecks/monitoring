import React from 'react';

import { Button } from '@mui/material';

import { Sort } from '../../../assets/icon/icon';

interface FiltersSortButtonProps {
  handleOpenSortMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
  isLoading: boolean;
}

const FiltersSortButton = ({ handleOpenSortMenu, isLoading }: FiltersSortButtonProps) => (
  <Button variant="text" startIcon={<Sort />} onClick={handleOpenSortMenu} disabled={isLoading} sx={{ minHeight: 30 }}>
    Sort
  </Button>
);

export default FiltersSortButton;
