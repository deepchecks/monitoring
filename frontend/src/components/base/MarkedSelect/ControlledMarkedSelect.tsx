import React, { memo, Dispatch, SetStateAction } from 'react';

import { SelectChangeEvent, MenuItem, SelectProps } from '@mui/material';

import { MarkedSelect } from 'components/base/MarkedSelect';

export type ControlledMarkedSelectSelectValues = string | number | undefined;
export type ControlledMarkedSelectSelectValueType =
  | ControlledMarkedSelectSelectValues
  | { label: string; value: number };
export type ControlledMarkedSelectDisabledCallback = (value: ControlledMarkedSelectSelectValueType) => boolean;

interface ControlledMarkedSelectProps extends SelectProps {
  values: ControlledMarkedSelectSelectValueType[];
  value: ControlledMarkedSelectSelectValues;
  setValue: Dispatch<SetStateAction<ControlledMarkedSelectSelectValues>>;
  clearValue?: () => void;
  DisabledCallback?: ControlledMarkedSelectDisabledCallback;
}

export const ControlledMarkedSelectComponent = ({
  label,
  values,
  value,
  setValue,
  clearValue,
  DisabledCallback,
  ...props
}: ControlledMarkedSelectProps) => {
  const handleValueChange = (event: SelectChangeEvent<unknown>) => setValue(event.target.value as string | number);

  return (
    <MarkedSelect label={label} value={value} onChange={handleValueChange} clearValue={clearValue} {...props}>
      {values.map((value, index) => {
        const isObj = typeof value === 'object';

        return (
          <MenuItem
            key={`${value}${index}`}
            value={isObj ? value.value : value}
            disabled={DisabledCallback !== undefined ? DisabledCallback(value) : false}
          >
            {isObj ? value.label : value}
          </MenuItem>
        );
      })}
    </MarkedSelect>
  );
};

export const ControlledMarkedSelect = memo(ControlledMarkedSelectComponent);
