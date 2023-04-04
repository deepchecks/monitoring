import { createTheme, Theme } from '@mui/material';
import { breakpointOptions } from './breakpoints';
import { componentOptions } from './components';
import { lightPaletteOptions } from './palette';
import { typographyOptions } from './typography';

const theme: Theme = createTheme({
  palette: lightPaletteOptions,
  breakpoints: breakpointOptions,
  typography: typographyOptions,
  components: componentOptions
});

export { theme };
