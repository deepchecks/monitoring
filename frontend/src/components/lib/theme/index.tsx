import { createTheme, Theme } from '@mui/material';

import { typographyOptions } from './typography';
import { darkModePalette, paletteOptions } from './palette';
import { breakpointOptions } from './breakpoints';

const theme: Theme = createTheme({
  palette: paletteOptions,
  breakpoints: breakpointOptions,
  typography: typographyOptions
});

const darkTheme: Theme = createTheme({
  palette: darkModePalette,
  breakpoints: breakpointOptions,
  typography: typographyOptions
});

export { theme, darkTheme };
