import { Box, Button } from '@mui/material';
import { Settings } from 'assets/icon/icon';
import React from 'react';
import { useNavigate } from 'react-router-dom';

export const AlertsHeader = () => {
  const navigate = useNavigate();

  const linkToSettings = () => {
    navigate({ pathname: '/configuration/notifications' });
  };

  return (
    <>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '20px 0',
          justifyContent: 'space-between',
          height: '100px',
          width: '100%',
          marginBottom: '40px',
          borderBottom: theme => `1px dashed ${theme.palette.text.disabled}`
        }}
      >
        <Box
          component="h2"
          sx={{
            color: '#94a4ad'
          }}
        >
          Alerts
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Button
            sx={{ width: 136 }}
            startIcon={<Settings fill="#fff" width={20} height={20} />}
            onClick={linkToSettings}
          >
            Configure
          </Button>
        </Box>
      </Box>
    </>
  );
};
