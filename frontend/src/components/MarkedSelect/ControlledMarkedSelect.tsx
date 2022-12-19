import React, { memo, Dispatch, SetStateAction } from 'react';

import { SelectChangeEvent, MenuItem, SelectProps } from '@mui/material';

import { MarkedSelect } from 'components/MarkedSelect';

interface ControlledSelectProps extends SelectProps {
  values: (string | undefined)[];
  value: string | undefined;
  setValue: Dispatch<SetStateAction<string | undefined>>;
}

export const ControlledMarkedSelectComponent = ({
  label,
  values,
  value,
  setValue,
  ...props
}: ControlledSelectProps) => {
  const handleValueChange = (event: SelectChangeEvent<unknown>) => setValue(event.target.value as string);

  return (
    <MarkedSelect label={label} value={value} onChange={handleValueChange} {...props}>
      {values.map((value, index) => (
        <MenuItem key={`${value}${index}`} value={value}>
          {value}
        </MenuItem>
      ))}
    </MarkedSelect>
  );
};

export const ControlledMarkedSelect = memo(ControlledMarkedSelectComponent);
