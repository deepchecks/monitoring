import React, { ReactNode } from 'react';

import { Button as MUIButton, ButtonProps as MUIBtnProps, useTheme, CircularProgress } from '@mui/material';

export interface ButtonProps extends MUIBtnProps {
  label: string | ReactNode;
  loading?: boolean;
  margin?: string;
  width?: string;
}

export const Button = (props: ButtonProps) => {
  const { label, loading, width = 'auto', margin = '0', variant = 'contained' } = props;

  const theme = useTheme();

  const isHollow = variant === 'outlined';
  const buttonTextColor = !isHollow ? theme.palette.common.white : '';
  const loaderColor = !isHollow ? theme.palette.grey[100] : '';

  return (
    <MUIButton
      variant={variant}
      sx={{
        padding: '7px 24px',
        borderRadius: '28px',
        transition: '0.6s',
        width: width,
        margin: margin,
        color: buttonTextColor,
        BorderWidth: '2px'
      }}
      {...props}
    >
      {loading ? <CircularProgress sx={{ color: loaderColor }} size={20} /> : label}
    </MUIButton>
  );
};
