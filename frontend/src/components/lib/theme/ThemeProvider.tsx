import React, { ReactNode, useEffect } from 'react';

import { CssBaseline } from '@mui/material';
import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { setPaletteModeToStorage } from './darkMode.helpers';
import { theme } from '.';

interface Props {
  children: ReactNode | ReactNode[];
  darkMode?: boolean;
}

export const ThemeProvider = ({ children, darkMode }: Props) => {
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
