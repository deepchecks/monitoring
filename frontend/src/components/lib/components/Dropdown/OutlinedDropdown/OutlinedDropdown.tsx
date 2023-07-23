import React from 'react';

import { Select, SelectProps, FormControl, InputLabel, MenuItem, styled } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

export interface OutlinedDropdownProps extends SelectProps {
  label: string;
  value: any;
  setValue: (value: any) => void;
  data: { value: any; label: string }[];
}

export const OutlinedDropdown = ({ data, label, size, value, setValue }: OutlinedDropdownProps) => {
  return (
    <StyledFormControl>
      <StyledInputLabel>{label}</StyledInputLabel>
      <Select
        size={size}
        label={label}
        IconComponent={ArrowDropDownIcon}
        value={value}
        onChange={e => setValue(e.target.value)}
        MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}
        sx={theme => ({
          borderRadius: '5px',

          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.grey[300]
          }
        })}
      >
        {data.map(({ value, label }) => (
          <SelectPrimaryItem value={value} key={value}>
            {label}
          </SelectPrimaryItem>
        ))}
      </Select>
    </StyledFormControl>
  );
};

export const SelectPrimaryItem = MenuItem;

export const StyledFormControl = styled(FormControl)({
  minWidth: 160
});

export const StyledInputLabel = styled(InputLabel)(({ theme }) => ({
  color: theme.palette.text.disabled
}));
