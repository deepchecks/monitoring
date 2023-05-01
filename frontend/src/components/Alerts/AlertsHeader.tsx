import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Box, Button } from '@mui/material';

import { ShareButton } from '../base/Button/ShareButton';

import { Settings } from '@mui/icons-material';

interface AlertsHeaderProps {
  resolved?: number;
}

export const AlertsHeader = ({ resolved }: AlertsHeaderProps) => {
  const navigate = useNavigate();

  const linkToSettings = () => {
    navigate({ pathname: '/configuration/alert-rules', search: window.location.search });
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
          {resolved ? 'Resolved alerts' : 'Alerts'}
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ShareButton />
          <Button
            sx={{ width: 136, marginLeft: '1em' }}
            startIcon={<Settings width={20} height={20} />}
            onClick={linkToSettings}
          >
            Configure
          </Button>
        </Box>
      </Box>
    </>
  );
};
