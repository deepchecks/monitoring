import React, { ReactNode } from 'react';

import { Button, Stack, SxProps, useTheme } from '@mui/material';

import { Container } from '../../Container/Container';

export interface SelectProps {
  selections: { value: string | number; label: string }[];
  state: string | number | undefined | null;
  setState: (state: string | number | undefined | null) => void;
  margin?: string;
  connected?: boolean;
  disabled?: boolean;
  textOnly?: boolean;
  textOnlyEndAdornmentWhenActive?: ReactNode;
  sx?: SxProps;
}

export const Select = (props: SelectProps) => {
  const {
    selections,
    state,
    setState,
    margin = '0',
    connected,
    disabled,
    textOnly,
    textOnlyEndAdornmentWhenActive,
    sx
  } = props;

  const theme = useTheme();
  const manyItems = Number(selections?.length) > 1;

  const handleSelect = (value: string | number) => {
    if (value === state) {
      setState(undefined);
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
        return {
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
      sx={{ pointerEvents: disabled ? 'none' : 'auto', width: 'auto', ...sx }}
    >
      {textOnly
        ? selections.map((selection, i) => {
            const isSelected = selection.value === state;

            return (
              <Stack
                key={i}
                sx={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderBottom: isSelected ? `2px solid ${theme.palette.primary.main}` : 'none',
                  margin: '0 12px',
                  '&:first-of-type': { margin: '0 12px 0 0' }
                }}
              >
                <Button
                  value={selection.value}
                  onClick={() => handleSelect(selection.value)}
                  variant="text"
                  sx={{
                    color: isSelected ? theme.palette.primary.main : theme.palette.grey[400],
                    fontSize: '20px !important',
                    borderRadius: 0,
                    pointerEvents: manyItems && isSelected ? 'none' : 'auto'
                  }}
                  data-testid={
                    isSelected
                      ? `AppFiltersEnvButtonSelected${selection.value}`
                      : `AppFiltersEnvButton${selection.value}`
                  }
                >
                  {selection.label}
                </Button>
                {isSelected && textOnlyEndAdornmentWhenActive}
              </Stack>
            );
          })
        : selections.map((selection, i) => {
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
                  pointerEvents: manyItems && isSelected ? 'none' : 'auto',

                  ':hover': {
                    backgroundColor: colorsToUse(isSelected).background,
                    color: colorsToUse(isSelected).color,
                    borderColor: colorsToUse(isSelected).border
                  },

                  '&:last-of-type': { borderRadius: connected ? '0 16px 16px 0' : 'auto' },
                  '&:first-of-type': { borderRadius: connected ? '16px 0 0 16px' : 'auto' }
                }}
              >
                {selection.label}
              </Button>
            );
          })}
    </Container>
  );
};
