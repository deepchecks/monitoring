import { Avatar, Box, Typography } from '@mui/material';
import React from 'react';
import useUser from '../hooks/useUser';

export const UserInfo = () => {
  const { user } = useUser();
  if (!user) return null;

  const { full_name, picture_url } = user;

  return (
    <Box sx={{ mt: 4, p: 1, display: 'flex', justifyContent: 'center' }}>
      <Avatar sx={{ flexGrow: 0 }} alt={full_name} src={picture_url}></Avatar>
      <Typography
        sx={{
          flexGrow: 1,
          m: 1,
          lineHeight: '150%',
          textTransform: 'ellipsis',
          fontFamily: 'Roboto',
          fontWeight: 400,
          alignItems: 'center',
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
