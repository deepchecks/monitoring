import { alpha, PaletteOptions } from '@mui/material';
import { AlertSeverity } from 'api/generated';
import { colors } from './colors';

declare module '@mui/material' {
  interface Color {
    dark: string;
    light: string;
  }

  interface Palette {
    severity: Record<AlertSeverity, string>;
  }

  interface PaletteOptions {
    severity: Record<AlertSeverity, string>;
  }
}

export const lightPaletteOptions: PaletteOptions = {
  mode: 'light',
  common: {
    black: colors.neutral.black,
    white: colors.neutral.white
  },
  primary: {
    dark: colors.primary.violet[500],
    light: colors.primary.violet[100],
    main: colors.primary.violet[400],
    contrastText: colors.primary.violet[200]
  },
  secondary: {
    dark: colors.semantic.orange,
    light: colors.semantic.yellow[50],
    main: colors.semantic.yellow[100]
  },
  severity: {
    low: colors.neutral.lightText,
    mid: colors.semantic.yellow[100],
    high: colors.semantic.orange,
    critical: colors.semantic.red
  },
  error: {
    main: colors.semantic.red,
    dark: colors.semantic.orange,
    light: colors.semantic.yellow[100],
    contrastText: colors.neutral.lightText
  },
  warning: {
    main: colors.semantic.red,
    dark: colors.semantic.orange,
    light: colors.semantic.yellow[100],
    contrastText: colors.neutral.lightText
  },
  info: {
    main: colors.accent.blue[100]
  },
  success: {
    main: colors.semantic.green[100],
    light: colors.semantic.green[50]
  },
  grey: {
    50: colors.neutral.grey[50],
    100: colors.neutral.grey[100],
    200: colors.neutral.grey[200],
    300: colors.neutral.grey[300]
  },
  text: {
    primary: colors.neutral.darkText,
    secondary: alpha(colors.neutral.black, 0.87),
    disabled: colors.neutral.lightText
  },
  divider: colors.neutral.darkText
};
