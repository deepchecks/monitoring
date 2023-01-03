import React, { memo, Dispatch, SetStateAction } from 'react';

import { SelectChangeEvent, MenuItem, SelectProps } from '@mui/material';

import { MarkedSelect } from 'components/MarkedSelect';

export type ControlledMarkedSelectSelectValues = string | number | undefined;

interface ControlledMarkedSelectProps extends SelectProps {
  values: (ControlledMarkedSelectSelectValues | { label: string; value: number })[];
  value: ControlledMarkedSelectSelectValues;
  setValue: Dispatch<SetStateAction<ControlledMarkedSelectSelectValues>>;
  clearValue?: () => void;
}

export const ControlledMarkedSelectComponent = ({
  label,
  values,
  value,
  setValue,
  clearValue,
  ...props
}: ControlledMarkedSelectProps) => {
  const handleValueChange = (event: SelectChangeEvent<unknown>) => setValue(event.target.value as string | number);

  return (
    <MarkedSelect label={label} value={value} onChange={handleValueChange} clearValue={clearValue} {...props}>
      {values.map((value, index) => {
        const isObj = typeof value === 'object';

        return (
          <MenuItem key={`${value}${index}`} value={isObj ? value.value : value}>
            {isObj ? value.label : value}
          </MenuItem>
        );
      })}
    </MarkedSelect>
  );
};

export const ControlledMarkedSelect = memo(ControlledMarkedSelectComponent);
