import { alpha, Avatar, Box, Divider, Menu, Typography } from '@mui/material';
import { logoutApiV1AuthLogoutGet } from 'api/generated';
import React from 'react';
import { cancelPendingRequests } from 'services/customAxios';
import useUser from '../hooks/useUser';
import { StyledMenuItem } from './Dashboard/MonitorList/components/GraphicsSection/GraphicsSection.style';

export const UserInfo = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const { user } = useUser();
  if (!user) return null;

  const { full_name, picture_url } = user;

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    setAnchorEl(event.currentTarget);
  };
  // const handleMyAccount = () => {
  //   handleClose();
  // };
  const handleLogout = () => {
    cancelPendingRequests();
    logoutApiV1AuthLogoutGet().then(() => {
      handleClose();
    });
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <Box
        sx={{ mt: 4, pt: '7px', pb: '27px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        onClick={handleClick}
      >
        <Avatar
          sx={{
            width: { xs: '24px', lg: '24px', xl: '36px' },
            height: { xs: '24px', lg: '24px', xl: '36px' },
            flexGrow: 0,
            border: theme => `2px solid ${alpha(theme.palette.common.white, 0.2)}`
          }}
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
      <Divider
        sx={{
          border: `1px dashed rgba(255, 255, 255, 0.4)`
        }}
      />
      <Typography
        sx={{
          lineHeight: '140%',
          textTransform: 'ellipsis',
          fontFamily: 'Roboto',
          fontWeight: 400,
          fontSize: 12,
          marginTop: '20px',
          letterSpacing: '0.1px',
          color: 'rgba(255, 255, 255, 0.7)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {user.organization?.name}
      </Typography>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'basic-button'
        }}
      >
        {/* <StyledMenuItem sx={{minWidth: 200}} onClick={handleMyAccount}><Typography variant="body2">My account</Typography></StyledMenuItem> */}
        <StyledMenuItem sx={{ minWidth: 200 }} onClick={handleLogout}>
          <Typography variant="body2">Logout</Typography>
        </StyledMenuItem>
      </Menu>
    </>
  );
};
