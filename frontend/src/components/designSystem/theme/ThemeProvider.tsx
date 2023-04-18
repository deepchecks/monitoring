import React, { ReactNode, useEffect } from 'react';

import { CssBaseline } from '@mui/material';
import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import { createTheme, Theme } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { breakpointOptions } from './breakpoints';
import { paletteOptions } from './palette';
import { typographyOptions } from './typography';
import { setPaletteModeToStorage } from './darkMode.helpers';

interface Props {
  children: ReactNode | ReactNode[];
  darkMode?: boolean;
}

export const ThemeProvider = ({ children, darkMode }: Props) => {
  const theme: Theme = createTheme({
    palette: paletteOptions,
    breakpoints: breakpointOptions,
    typography: typographyOptions
  });

  useEffect(() => {
    setPaletteModeToStorage(darkMode);
  }, [darkMode]);

  return (
    <MUIThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>{children}</LocalizationProvider>
    </MUIThemeProvider>
  );
};
