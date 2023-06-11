import React from 'react';

import { Button, useTheme } from '@mui/material';

import { Container } from '../../Container/Container';

import { isDarkMode } from '../../../theme/darkMode.helpers';

export interface SelectProps {
  selections: { value: any; label: string }[];
  state: any;
  setState: (state: any) => void;
  margin?: string;
  connected?: boolean;
  disabled?: boolean;
}

export const Select = (props: SelectProps) => {
  const { selections, state, setState, margin = '0', connected, disabled } = props;

  const theme = useTheme();

  const handleSelect = (value: any) => {
    if (value === state) {
      setState(null);
    } else {
      setState(value);
    }
  };

  const colorsToUse = (isSelected: boolean) => {
    switch (isSelected) {
      case true:
        return {
          background: theme.palette.primary.main,
          color: theme.palette.common.white,
          border: theme.palette.primary.main
        };
      case false:
        return isDarkMode
          ? {
              background: theme.palette.common.black,
              color: theme.palette.primary.main,
              border: theme.palette.primary.main
            }
          : {
              background: theme.palette.common.white,
              color: theme.palette.primary.main,
              border: theme.palette.primary.main
            };
      default:
        return {
          background: theme.palette.common.white,
          color: theme.palette.primary.main,
          border: theme.palette.primary.main
        };
    }
  };

  return (
    <Container
      flexDirection="row"
      gap={connected ? 0 : '16px'}
      margin={margin}
      sx={{ pointerEvents: disabled ? 'none' : 'auto' }}
    >
      {selections.map((selection, i) => {
        const isSelected = selection.value === state;

        return (
          <Button
            key={i}
            value={selection.value}
            onClick={() => handleSelect(selection.value)}
            sx={{
              borderWidth: '1px',
              borderStyle: 'solid',
              padding: '7px 24px',
              transition: '0.5s',
              backgroundColor: colorsToUse(isSelected).background,
              color: colorsToUse(isSelected).color,
              borderColor: colorsToUse(isSelected).border,
              borderRadius: connected ? 0 : '28px',

              ':hover': {
                backgroundColor: colorsToUse(isSelected).background,
                color: colorsToUse(isSelected).color,
                borderColor: colorsToUse(isSelected).border
              },

              '&:last-child': { borderRadius: connected ? '0 16px 16px 0' : 'auto' },
              '&:first-child': { borderRadius: connected ? '16px 0 0 16px' : 'auto' }
            }}
          >
            {selection.label}
          </Button>
        );
      })}
    </Container>
  );
};
