import React from 'react';

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { Select, SelectProps, FormControl, InputLabel, MenuItem, styled } from '@mui/material';

export interface OutlinedDropdownProps extends SelectProps {
  label: string;
  dataTestid?: string;
  value: string | number | undefined;
  setValue: (value: string | number) => void;
  data: { value: string | number; label: string }[];
}

export const OutlinedDropdown = ({
  data,
  label,
  size,
  value,
  setValue,
  disabled,
  dataTestid
}: OutlinedDropdownProps) => {
  return (
    <StyledFormControl>
      <StyledInputLabel>{label}</StyledInputLabel>
      <Select
        size={size}
        disabled={disabled}
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
        data-testid={dataTestid}
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
