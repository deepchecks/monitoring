import { PaletteOptions as MUIPaletteOptions } from '@mui/material';

interface PaletteOptions extends MUIPaletteOptions {
  severity?: {
    low: string;
    medium: string;
    high: string;
    critical: string;
  };
}

export const paletteOptions: PaletteOptions = {
  mode: 'light',
  common: {
    black: '#070914', // Black
    white: '#FFFFFF' // White
  },
  primary: {
    main: '#7964FF' // Purple
  },
  secondary: {
    main: '#007AFF', // Blue
    light: '#42CBE9' // Light Blue
  },
  error: {
    main: '#FC636B' // Red
  },
  success: {
    main: '#37A862', // Green
    light: '#B8E24A' // Light green
  },
  info: {
    main: '#B2BCC4' // Grey[300]
  },
  grey: {
    100: '#EDEDED',
    200: '#D8DDE1',
    300: '#B2BCC4',
    400: '#8B9AA6',
    500: '#6A7687',
    600: '#464D5A',
    700: '#222835',
    800: '#161B24'
  },
  severity: {
    low: '#B2BCC4', // Grey[300]
    medium: '#FFC900', // Yellow
    high: '#FD742D', // Orange
    critical: '#FC636B' // Red
  }
};
