import { createTheme, Theme } from '@mui/material';
import { typographyOptions } from 'components/lib/theme/typography';
import { paletteOptions } from 'components/lib/theme/palette';
import { breakpointOptions } from 'components/lib/theme/breakpoints';

const theme: Theme = createTheme({
  palette: paletteOptions,
  breakpoints: breakpointOptions,
  typography: typographyOptions
});

export { theme };
