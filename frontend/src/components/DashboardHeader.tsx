import React from 'react';
import { useLocation } from 'react-router-dom';
import { Stack, Box, Button, Typography } from '@mui/material';
import { useCountAlertsApiV1AlertsCountActiveGet } from '../api/generated';
import { PlusIcon } from '../assets/icon/icon';
import { AlertCount, SEVERITY } from './AlertCount';
import { ID } from '../helpers/types';

interface DashboardHeaderProps {
  onOpen: () => void;
}

export const DashboardHeader = ({ onOpen }: DashboardHeaderProps) => {
  const { data } = useCountAlertsApiV1AlertsCountActiveGet();
  return (
    <>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '20px 48px 20px 0',
          justifyContent: 'space-between',
          height: '100px',
          width: '100%',
          marginBottom: '35px',
          borderBottom: theme => `1px dashed ${theme.palette.text.disabled}`
        }}
      >
        <Box
          component="h2"
          sx={{
            color: '#94a4ad'
          }}
        >
          My Dashboard
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Stack spacing="20px" alignItems="center" direction="row">
            <AlertCount count={data?.critical ? data.critical : 0} severity={SEVERITY.CRITICAL} />
            <AlertCount count={data?.high ? data.high : 0} severity={SEVERITY.HIGH} />
          </Stack>
          <Box
            sx={{
              backgroundColor: '#B3BEC4',
              margin: '0 20px 0 30px',
              height: '42px',
              width: '1px'
            }}
          />
          <Box onClick={() => onOpen()}>
            <Button
              sx={{
                textTransform: 'none',
                padding: '8px'
              }}
              variant="text"
              startIcon={<PlusIcon />}
            >
              <Typography
                sx={{
                  color: '#9D60FB',
                  fontSize: '14px',
                  fontWeight: 400,
                  marginLeft: '4px'
                }}
              >
                Add Monitor
              </Typography>
            </Button>
          </Box>
        </Box>
      </Box>
    </>
  );
};
