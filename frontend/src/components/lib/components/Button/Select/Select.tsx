import React from 'react';

import { Button, useTheme } from '@mui/material';

import { Container } from '../../Container/Container';

import { isDarkMode } from '../../../theme/darkMode.helpers';

export interface SelectProps {
  selections: any[];
  state: any;
  setState: (state: any) => void;
}

export const Select = (props: SelectProps) => {
  const { selections, state, setState } = props;

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
    <Container flexDirection="row" gap="16px">
      {selections.map((value: any, i) => {
        const isSelected = value === state;

        return (
          <Button
            key={i}
            value={value}
            onClick={() => handleSelect(value)}
            sx={{
              borderWidth: '1px',
              borderStyle: 'solid',
              padding: '7px 24px',
              borderRadius: '28px',
              transition: '0.5s',
              backgroundColor: colorsToUse(isSelected).background,
              color: colorsToUse(isSelected).color,
              borderColor: colorsToUse(isSelected).border,

              ':hover': {
                backgroundColor: colorsToUse(isSelected).background,
                color: colorsToUse(isSelected).color,
                borderColor: colorsToUse(isSelected).border
              }
            }}
          >
            {value}
          </Button>
        );
      })}
    </Container>
  );
};
