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
    main: '#9159F7', // Purple
    light: '#F0EBFF' // Light Purple
  },
  secondary: {
    main: '#0056B3', // Blue
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
    50: '#FDFDFE',
    100: '#F7F7FB',
    200: '#EAE9F4',
    300: '#C6C6DC',
    400: '#A3A3BB',
    500: '#7E7E9F',
    600: '#595A74',
    700: '#2A2B44',
    800: '#171724'
  },
  severity: {
    low: '#B2BCC4', // Grey[300]
    medium: '#FFC900', // Yellow
    high: '#FD742D', // Orange
    critical: '#FC636B' // Red
  }
};

export const darkModePalette: PaletteOptions = {
  mode: 'dark',
  common: {
    black: '#FFFFFF', // White
    white: '#1a1825' // Black
  },
  primary: {
    main: '#7964FF' // Purple
  },
  secondary: {
    main: '#0056B3', // Blue
    light: '#42CBE9' // Light Blue
  },
  error: {
    main: '#FC636B' // Red
  },
  success: {
    main: '#37A862', // Green
    light: '#B8E24A' // Light Green
  },
  info: {
    main: '#B2BCC4' // Grey[300]
  },
  grey: {
    50: '#171724',
    100: '#212130',
    200: '#2c2b40',
    300: '#7E7E9F',
    400: '#9393B7',
    500: '#B9B9D8',
    600: '#D1D1E6',
    700: '#E8E8F7',
    800: '#FCFCFD'
  },
  severity: {
    low: '#B2BCC4', // Grey[300]
    medium: '#FFC900', // Yellow
    high: '#FD742D', // Orange
    critical: '#FC636B' // Red
  }
};
