import React, { ReactNode } from 'react';

import { Button as MUIButton, ButtonProps as MUIBtnProps, useTheme, CircularProgress, styled } from '@mui/material';

export interface ButtonProps extends MUIBtnProps {
  label: string | ReactNode;
  loading?: boolean;
  margin?: string;
  width?: string;
}

interface StyledMUIButtonProps {
  width: string;
  margin: string;
  buttonTextColor: string;
}

const StyledMUIButton = styled(MUIButton, {
  shouldForwardProp: prop => prop !== 'buttonTextColor' && prop !== 'margin' && prop !== 'width'
})<StyledMUIButtonProps>(({ width, margin, buttonTextColor }) => ({
  padding: '7px 24px',
  borderRadius: '28px',
  borderWidth: '2px',
  transition: '0.6s',
  width: width,
  margin: margin,
  color: buttonTextColor,
  BorderWidth: '2px',

  '&:hover': { borderWidth: '2px' }
}));

export const Button = (props: ButtonProps) => {
  const { label, loading, width = 'auto', margin = '0', variant = 'contained', ...otherProps } = props;

  const theme = useTheme();

  const isHollow = variant === 'outlined';
  const buttonTextColor = !isHollow ? theme.palette.common.white : '';
  const loaderColor = !isHollow ? theme.palette.grey[100] : '';

  return (
    <StyledMUIButton
      variant={variant}
      width={width}
      margin={margin}
      buttonTextColor={buttonTextColor}
      sx={{ pointerEvents: loading ? 'none' : 'auto' }}
      {...otherProps}
    >
      {loading ? <CircularProgress sx={{ color: loaderColor }} size={20} /> : label}
    </StyledMUIButton>
  );
};
