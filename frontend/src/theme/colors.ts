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
    blue: {
      70: alpha('#101F39', 0.7),
      100: '#101F39'
    },
    darkText: '#303245',
    lightText: '#7D7E8E',
    grey: {
      disabled: '#E1E4E5',
      light: '#E7E7E7',
      semiLight: '#F9F9F9',
      50: alpha('#F9F9F9', 0.5),
      100: '#F9F9F9',
      150: alpha('#D1D8DC', 0.5),
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
    salmon: '#DD5841',
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
