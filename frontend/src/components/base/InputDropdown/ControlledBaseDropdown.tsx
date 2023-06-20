import React, { memo, Dispatch, SetStateAction } from 'react';

import { SelectChangeEvent, MenuItem, SelectProps, SxProps } from '@mui/material';

import { BaseDropdown } from './InputDropdown';

export type ControlledBaseDropdownSelectValues = string | number | undefined;
export type ControlledBaseDropdownSelectValueType =
  | ControlledBaseDropdownSelectValues
  | { label: string; value: number };
export type ControlledBaseDropdownDisabledCallback = (value: ControlledBaseDropdownSelectValueType) => boolean;

interface ControlledBaseDropdownProps extends SelectProps {
  values: ControlledBaseDropdownSelectValueType[];
  value: ControlledBaseDropdownSelectValues;
  setValue: Dispatch<SetStateAction<ControlledBaseDropdownSelectValues>>;
  clearValue?: () => void;
  DisabledCallback?: ControlledBaseDropdownDisabledCallback;
  sx?: SxProps;
}

export const ControlledBaseDropdownComponent = ({
  label,
  values,
  value,
  setValue,
  clearValue,
  DisabledCallback,
  sx,
  ...otherProps
}: ControlledBaseDropdownProps) => {
  const handleValueChange = (event: SelectChangeEvent<unknown>) => setValue(event.target.value as string | number);

  return (
    <BaseDropdown
      label={label}
      value={value}
      onChange={handleValueChange}
      clearValue={clearValue}
      sx={sx}
      {...otherProps}
    >
      {values.map((value, index) => {
        const isObj = typeof value === 'object';

        return (
          <MenuItem
            key={`${value}${index}`}
            value={isObj ? value.value : value}
            disabled={DisabledCallback ? DisabledCallback(value) : false}
          >
            {isObj ? value.label : value}
          </MenuItem>
        );
      })}
    </BaseDropdown>
  );
};

export const ControlledBaseDropdown = memo(ControlledBaseDropdownComponent);
