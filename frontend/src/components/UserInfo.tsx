import { alpha, Avatar, Box, Typography } from '@mui/material';
import React from 'react';
import useUser from '../hooks/useUser';

export const UserInfo = () => {
  const { user } = useUser();
  if (!user) return null;

  const { full_name, picture_url } = user;

  return (
    <Box sx={{ mt: 4, p: '7px 0', display: 'flex', alignItems: 'center' }}>
      <Avatar
        sx={{ flexGrow: 0, border: theme => `2px solid ${alpha(theme.palette.common.white, 0.2)}` }}
        alt={full_name}
        src={picture_url}
      ></Avatar>
      <Typography
        sx={{
          lineHeight: '140%',
          textTransform: 'ellipsis',
          fontFamily: 'Roboto',
          fontWeight: 400,
          fontSize: 12,
          marginLeft: '8px',
          letterSpacing: '0.1px',
          textAlign: 'center',
          verticalAlign: 'middle',
          color: '#FFFFFF',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {user.full_name}
      </Typography>
    </Box>
  );
};
