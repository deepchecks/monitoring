import { alpha } from '@mui/material';

export const colors = {
  accent: {
    blue: {
      50: '#6BA5FD',
      100: '#0065FF'
    },
    pink: {
      50: '#FEACD5',
      100: '#EC6DA7',
      150: '#B2158B'
    },
    red: '#F27564'
  },
  neutral: {
    black: '#000000',
    blue: '#101F39',
    darkText: '#3A474E',
    lightText: '#94A4AD',
    grey: {
      disabled: '#E1E4E5',
      50: alpha('#F3F5F8', 0.5),
      100: '#F3F5F8',
      200: '#D1D8DC',
      300: '#B3BEC4'
    },
    white: '#ffffff'
  },
  primary: {
    violet: {
      100: '#F1E9FE',
      200: '#E2CFFE',
      300: '#B17DFF',
      400: '#9D60FB',
      500: '#5718B8',
      600: '#17003E'
    }
  },
  semantic: {
    orange: '#FF833D',
    red: '#EF4C36',
    yellow: {
      50: '#FFC400',
      100: '#FCB400'
    },
    green: {
      50: '#72DDC3',
      100: '#06A09B'
    }
  }
};
