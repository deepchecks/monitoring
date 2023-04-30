import React from 'react';

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';

interface DropdownArrowComponentProps {
  isDropdownOpen: boolean;
}

export const DropdownArrowComponent = ({ isDropdownOpen }: DropdownArrowComponentProps) =>
  isDropdownOpen ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />;
