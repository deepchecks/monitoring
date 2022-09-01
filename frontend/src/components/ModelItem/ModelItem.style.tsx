import React from 'react';
import { alpha, Box, ListItem, ListItemProps, styled, Typography } from '@mui/material';

interface StyledContainerProps {
  isBorder?: boolean;
}

export const StyledContainer = styled(
  (
    { isBorder, ...props }: ListItemProps & StyledContainerProps // eslint-disable-line @typescript-eslint/no-unused-vars
  ) => <ListItem {...props} />
)<StyledContainerProps>(({ isBorder = false, theme }) => {
  const style = isBorder
    ? {
        border: `1px dashed ${theme.palette.text.disabled}`,
        borderRight: 'none'
      }
    : {};
  return {
    padding: '21px 30px',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: theme.palette.grey[100]
    },
    ...style
  };
});

export const StyledModelInfo = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%'
});

export const StyledTypographyDate = styled(Typography)({
  marginTop: '4px'
});

export const StyledAlert = styled(Box)(({ theme }) => ({
  width: 50,
  height: 60,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: alpha(theme.palette.error.main, 0.1),
  borderRadius: '20px'
}));

export const StyledCounter = styled(Typography)(({ theme }) => ({
  color: theme.palette.error.main
}));
