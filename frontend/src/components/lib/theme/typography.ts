import { TypographyOptions } from '@mui/material/styles/createTypography';

import { paletteOptions } from './palette';

export const typographyOptions: TypographyOptions = {
  fontFamily: 'Manrope, sans-serif',
  h1: {
    fontSize: 24,
    fontWeight: 600,
    lineHeight: '32px',
    color: paletteOptions.grey?.[500]
  },
  h2: {
    fontSize: 20,
    fontWeight: 600,
    lineHeight: '24px',
    color: paletteOptions.grey?.[500]
  },
  h3: {
    fontSize: 16,
    fontWeight: 500,
    lineHeight: '22.4px',
    color: paletteOptions.grey?.[600]
  },
  h5: {
    fontSize: 12,
    fontWeight: 700,
    lineHeight: '12px',
    color: paletteOptions.grey?.[500]
  },
  h6: {
    fontWeight: 500,
    fontSize: '10px',
    lineHeight: '14.1px'
  },
  body1: {
    fontSize: 14,
    fontWeight: 500,
    lineHeight: '19.6px',
    color: paletteOptions.grey?.[500]
  },
  body2: {
    fontSize: 14,
    fontWeight: 700,
    lineHeight: '19.6px',
    color: paletteOptions.grey?.[400]
  },
  subtitle1: {
    fontSize: 10,
    fontWeight: 500,
    lineHeight: '14px',
    color: paletteOptions.grey?.[400]
  },
  subtitle2: {
    fontSize: 10,
    fontWeight: 700,
    lineHeight: '14px',
    color: paletteOptions.grey?.[400]
  },
  button: {
    fontSize: 14,
    fontWeight: 700,
    lineHeight: '19.6px',
    textTransform: 'none'
  }
};
