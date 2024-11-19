import React, { ReactNode } from 'react';

import { CssBaseline } from '@mui/material';
import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { darkTheme, theme } from '.';

interface Props {
  children: ReactNode | ReactNode[];
  darkMode?: boolean;
}

export const ThemeProvider = ({ children, darkMode }: Props) => {
  return (
    <MUIThemeProvider theme={darkMode ? darkTheme : theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>{children}</LocalizationProvider>
    </MUIThemeProvider>
  );
};
