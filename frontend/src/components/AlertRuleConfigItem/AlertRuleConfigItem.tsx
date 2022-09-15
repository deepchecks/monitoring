import React, { FC } from 'react';
import { Box, Stack, Typography, useTheme, SvgIcon } from '@mui/material';
import { AlertCount, SEVERITY } from './AlertCount';

export const AlertRuleConfigItem: FC = props => {
  const theme = useTheme();
  return (
    <Stack
      sx={{
        cursor: 'pointer',
        borderRadius: '10px',
        backgroundColor: theme.palette.common.white,
        boxShadow: ' 0px 4px 13px 2px rgba(0, 0, 0, 0.12)',
        lineHeight: '34px',
        border: '6px solid transparent',
        '&:hover': {
          borderColor: theme.palette.primary.contrastText
        }
      }}
    >
      <Stack direction="row">
        <AlertCount severity={SEVERITY.MEDIUM} />
        <Stack sx={{ p: '11px 13px', flexGrow: 1, backgroundColor: theme.palette.grey[50] }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '24px'
            }}
          >
            Title
          </Typography>
          <Typography sx={{ fontSize: '16px', fontWeight: 400, lineHeight: '24px' }}>subTitle</Typography>
        </Stack>
      </Stack>
      <Stack sx={{ m: '23px 40px' }}>
        <Stack direction="row">
          <Typography sx={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px', mr: '10px' }}>Check</Typography>
          <Typography sx={{ fontSize: '16px', fontWeight: 400, lineHeight: '24px' }}>Description</Typography>
        </Stack>
        <Stack direction="row">
          <Typography sx={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px', mr: '10px' }}>
            Check Frequency
          </Typography>
          <Typography sx={{ fontSize: '16px', fontWeight: 400, lineHeight: '24px' }}>Description</Typography>
        </Stack>
        <Stack direction="row">
          <Typography sx={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px', mr: '10px' }}>Alert #</Typography>
          <Typography sx={{ fontSize: '16px', fontWeight: 400, lineHeight: '24px' }}>Description</Typography>
        </Stack>
        <Stack direction="row">
          <Typography sx={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px', mr: '10px' }}>
            Recent Alert
          </Typography>
          <Typography sx={{ fontSize: '16px', fontWeight: 400, lineHeight: '24px' }}>Description</Typography>
        </Stack>
      </Stack>
    </Stack>
  );
};
