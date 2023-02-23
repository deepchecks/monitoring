import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { addDecorator } from '@storybook/react';

import { theme } from '../src/theme/index';

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/
    }
  }
};

addDecorator(story => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    {story()}
  </ThemeProvider>
));
