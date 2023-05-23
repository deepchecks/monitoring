import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Box, Button } from '@mui/material';

import { ShareButton } from '../base/Button/ShareButton';

import { Settings } from '@mui/icons-material';
import { StyledText } from 'components/lib';

interface AlertsHeaderProps {
  resolved?: number;
}

export const AlertsHeader = ({ resolved }: AlertsHeaderProps) => {
  const navigate = useNavigate();

  const linkToSettings = () => {
    navigate({ pathname: '/configuration/alert-rules', search: window.location.search });
  };

  const title = resolved ? 'Resolved alerts' : 'Alerts';

  return (
    <>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '20px 0',
          justifyContent: 'space-between',
          height: '100px'
        }}
      >
        <StyledText text={title} type="h1" />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '24px', margin: '0 16px' }}>
          <ShareButton />
          <Button startIcon={<Settings width={20} height={20} />} onClick={linkToSettings}>
            Configure
          </Button>
        </Box>
      </Box>
    </>
  );
};
