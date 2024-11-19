import React, { useState } from 'react';

import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import { Checkbox as MUICheckbox, FormGroup, CheckboxProps as MUICheckboxProps, Stack, useTheme } from '@mui/material';

import { Text } from '../../Text/Text';

import { paletteOptions } from '../../../theme/palette';

export interface CheckboxProps extends MUICheckboxProps {
  state: string[];
  setState: (state: string[]) => void;
  options: {
    value: string;
    label?: string;
    count?: number;
    disabled?: boolean;
  }[];
  formTitle?: string;
  disabled?: boolean;
  defaultValue?: string;
  direction?: 'row' | 'column';
  limit?: number;
  withSelectAll?: boolean;
}

export const Checkbox = (props: CheckboxProps) => {
  const {
    state,
    setState,
    options,
    formTitle,
    disabled,
    direction = 'column',
    limit = options.length,
    withSelectAll,
    ...otherProps
  } = props;

  const theme = useTheme();

  const [err, setErr] = useState(false);

  const isAllSelected = state.length === options.length;
  const allCount: number = options?.reduce((sum, option) => sum + (option?.count ? Number(option?.count) : 0), 0);

  const labelColor = (value: string) =>
    state.includes(value) && paletteOptions.primary
      ? paletteOptions.primary['main' as keyof typeof paletteOptions.primary]
      : '';

  const handleCheckboxClick = (value: string) => {
    setErr(false);

    if (state.includes(value)) {
      setState(state.filter((stateVal: string) => value !== stateVal));
    } else {
      if (state.length === limit) {
        setErr(true);
      } else {
        setState([...state, value]);
      }
    }
  };

  const handleSelectAllClick = () => {
    setErr(false);
    if (state.length === options.length) {
      setState([]);
    } else {
      setState(options.map(option => option.value));
    }
  };

  return (
    <FormControl>
      {formTitle && <Text type="bodyBold" text={formTitle} color={paletteOptions.grey?.[500]} />}
      <FormGroup row={direction === 'row'}>
        {withSelectAll && (
          <>
            <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
              <FormControlLabel
                control={<MUICheckbox disabled={disabled} checked={isAllSelected} {...otherProps} />}
                label={
                  <Text
                    text="Select All"
                    type="bodyBold"
                    margin="2px 0 0 -2px"
                    color={
                      isAllSelected && paletteOptions.primary
                        ? paletteOptions.primary['main' as keyof typeof paletteOptions.primary]
                        : ''
                    }
                  />
                }
                onChange={handleSelectAllClick}
              />
              {allCount ? <Text text={`(${allCount})`} marginLeft="8px" /> : <></>}
            </Stack>
            <Stack sx={{ height: '2px', background: theme.palette.grey[200], width: '100%' }} />
          </>
        )}
        {options.map((option, i) => (
          <Stack key={i} flexDirection="row" justifyContent="space-between" alignItems="center">
            <FormControlLabel
              value={option.value}
              control={
                <MUICheckbox
                  disabled={disabled || option?.disabled}
                  checked={state.includes(option.value)}
                  {...otherProps}
                />
              }
              label={
                option.label && (
                  <Text
                    color={() => labelColor(option.value)}
                    text={option.label}
                    type="bodyBold"
                    sx={{
                      margin: '2px 0 0 -2px',
                      opacity: option?.disabled ? 0.5 : 1
                    }}
                  />
                )
              }
              onChange={() => handleCheckboxClick(option.value)}
            />
            {typeof option?.count === 'number' ? <Text text={`(${option.count})`} marginLeft="8px" /> : <></>}
          </Stack>
        ))}
      </FormGroup>
      {err && (
        <Text
          color={paletteOptions.error?.['main' as keyof typeof paletteOptions.error]}
          type="h3"
          text={`Limited to ${limit} selections`}
        />
      )}
    </FormControl>
  );
};
