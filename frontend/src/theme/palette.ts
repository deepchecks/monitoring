import { alpha, PaletteOptions } from '@mui/material';
import { AlertSeverity } from 'api/generated';

declare module '@mui/material' {
  interface Color {
    dark: string;
    light: string;
  }

  interface Palette {
    severity: Record<AlertSeverity, string>;
  }

  interface PaletteOptions {
    severity?: Record<AlertSeverity, string>;
  }
}

export const lightPaletteOptions: PaletteOptions = {
  mode: 'light',
  common: {
    black: '#000000',
    white: '#ffffff'
  },
  primary: {
    dark: '#5718B8',
    light: '#F1E9FE',
    main: '#9D60FB',
    contrastText: '#E2CFFE'
  },
  secondary: {
    dark: '#FF833D',
    light: '#FFC400',
    main: '#FCB400'
  },
  severity: {
    low: '#7D7E8E',
    medium: '#FCB400',
    high: '#FF833D',
    critical: '#EF4C36'
  },
  error: {
    main: '#EF4C36',
    dark: '#FF833D',
    light: '#FCB400',
    contrastText: '#7D7E8E'
  },
  warning: {
    main: '#EF4C36',
    dark: '#FF833D',
    light: '#FCB400',
    contrastText: '#7D7E8E'
  },
  info: {
    main: '#101F39'
  },
  success: {
    main: '#06A09B',
    light: '#72DDC3'
  },
  grey: {
    light: '#E7E7E7',
    50: alpha('#F3F5F8', 0.5),
    100: '#F3F5F8',
    200: '#D1D8DC',
    300: '#B3BEC4'
  },
  text: {
    primary: '#303245',
    secondary: alpha('#00000', 0.87),
    disabled: '#7D7E8E'
  },
  divider: '#303245'
};
