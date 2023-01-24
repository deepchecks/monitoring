import { AppBar, IconButton, Toolbar, Typography, useTheme } from '@mui/material';
import { CloseIcon } from 'assets/icon/icon';
import React, { useContext } from 'react';
import { AlertRuleDialogContext } from './AlertRuleDialogContext';

interface DialogTopBarProps {
  handleClose: () => void;
}

export const DialogTopBar = ({ handleClose }: DialogTopBarProps) => {
  const theme = useTheme();
  const { monitor } = useContext(AlertRuleDialogContext);

  return (
    <AppBar
      sx={{
        position: 'relative',
        backgroundColor: 'inherit',
        boxShadow: 'unset',
        m: '28px auto 51px'
      }}
    >
      <Toolbar sx={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: 'unset !important' }}>
        <Typography
          sx={{
            m: '0 auto',
            justifySelf: 'center',
            fontSize: '24px',
            fontWeight: '700',
            color: theme.palette.text.primary
          }}
          component="h1"
        >
          {monitor?.name ? `Edit Alert Rule: ${monitor?.name}` : 'Create New Alert'}
        </Typography>
        <IconButton
          sx={{
            justifySelf: 'flex-end',
            color: 'inherit',
            mr: '-50px',
            backgroundColor: 'inherit'
          }}
          onClick={() => handleClose()}
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};
