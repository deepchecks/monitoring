import { Theme } from '@mui/material';

export const DesktopDatePickerStyle = {
  '& button': {
    backgroundColor: 'transparent',
    '& svg': {
      color: (theme: Theme) => theme.palette.text.primary
    }
  },
  '& .MuiOutlinedInput-root button:hover': {
    background: 'rgba(157, 96, 251, 0.04)'
  }
};

export const InputStyle = {
  width: 160,
  '& button': {
    backgroundColor: 'transparent',
    borderRadius: '50%',
    padding: '4px',
    '& svg': {
      color: (theme: Theme) => theme.palette.text.primary
    }
  }
};
