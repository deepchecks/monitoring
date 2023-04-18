import React, { ReactNode } from 'react';

import { Button as MUIButton, ButtonProps as MUIBtnProps, useTheme, CircularProgress } from '@mui/material';

export interface ButtonProps extends MUIBtnProps {
  label: string | ReactNode;
  loading?: boolean;
  margin?: string;
  width?: string;
}

export const Button = (props: ButtonProps) => {
  const { label, loading, width = 'auto', margin = '0' } = props;

  const theme = useTheme();

  return (
    <MUIButton
      variant="contained"
      sx={{
        padding: '8px 24px',
        borderRadius: '28px',
        transition: '0.5s',
        width: width,
        margin: margin,
        color: theme.palette.common.white
      }}
      {...props}
    >
      {loading ? <CircularProgress sx={{ color: theme.palette.grey[100] }} size={20} /> : label}
    </MUIButton>
  );
};
